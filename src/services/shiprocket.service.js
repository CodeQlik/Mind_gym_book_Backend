import axios from "axios";
import { redisClient } from "../config/redis.js";
import logger from '../utils/logger.js'; // Assuming a logger utility

class ShiprocketService {
  constructor() {
    this.email = process.env.SHIPROCKET_EMAIL;
    this.password = process.env.SHIPROCKET_PASSWORD;
    this.baseUrl = process.env.SHIPROCKET_BASE_URL;
  }

  /**
   * Authenticate with Shiprocket and get the JWT token.
   * Caches the token in Redis for 9 days.
   */
  async getToken() {
    try {
      const email = process.env.SHIPROCKET_EMAIL?.trim();
      const password = process.env.SHIPROCKET_PASSWORD?.trim();

      if (!email || !password) {
        throw new Error("Shiprocket credentials are missing in .env");
      }

      const cachedToken = await redisClient.get("shiprocket_token");
      if (cachedToken) return cachedToken;

      const response = await axios.post(
        `${this.baseUrl}/v1/external/auth/login`,
        {
          email,
          password,
        },
      );

      if (!response.data || !response.data.token) {
        throw new Error("Invalid response from Shiprocket API");
      }

      const token = response.data.token;
      // Token usually expires in 10 days, cache for 9 days
      await redisClient.set("shiprocket_token", token, {
        EX: 9 * 24 * 60 * 60,
      });
      return token;
    } catch (error) {
      logger.error(
        "Shiprocket Auth Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Shiprocket Authentication Failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create an order in Shiprocket for a physical book order.
   */
  async createCustomOrder(order, user, address, items) {
    try {
      const token = await this.getToken();

      logger.info('DEBUG: Input address object:', address);
      // Ensure address is a clean object
      let shippingAddr = address;
      if (typeof address === "string" && address.startsWith("{")) {
        try {
          shippingAddr = JSON.parse(address);
          logger.info('DEBUG: Parsed address from string');
        } catch (e) {
          logger.error('DEBUG: Failed to parse address string', e);
        }
      }
      logger.info('DEBUG: Resolved shippingAddr final:', shippingAddr);

      // Fallback: If address object is missing or incomplete, try to use the snapshot string from the order
      if (!shippingAddr || !shippingAddr.city || !(shippingAddr.pincode || shippingAddr.pin_code)) {
        if (order.shipping_address) {
          const parts = order.shipping_address.split(",").map(p => p.trim());
          // Format usually: [Name (Optional)], Street, Apt, City, State - Pincode, Country
          // Example: 'Home, 123 Main Street, Apt 4B, Mumbai, Maharashtra - 400001, India'

          shippingAddr = {
            name: parts[0] || user?.name || "Customer",
            address_line1: parts[1] || order.shipping_address, // Fallback to full string if specific part is missing
            address_line2: parts[2] || "",
            city: parts[3] || "City",
            state: "State",
            pincode: "000000",
            country: "India"
          };

          // Try to extract State and Pincode from 'Maharashtra - 400001'
          const statePinPart = parts.find(p => p.includes("-"));
          if (statePinPart) {
            const [st, pin] = statePinPart.split("-").map(p => p.trim());
            shippingAddr.state = st;
            shippingAddr.pincode = pin;
          }

          // Try to get City (usually before the state-pin part)
          const statePinIdx = parts.findIndex(p => p.includes("-"));
          if (statePinIdx > 0) {
            shippingAddr.city = parts[statePinIdx - 1];
          }
        }
      }

      // Check if address fields are present
      const pincode = shippingAddr?.pincode || shippingAddr?.pin_code;
      if (!shippingAddr || !shippingAddr.city || !pincode || !shippingAddr.state) {
        throw new Error("Please add billing/shipping address first (Incomplete data)");
      }

      // Prepare items for Shiprocket
      const orderItems = items.map((item) => ({
        name: item.book.title,
        sku: `BOOK-${item.book.id}`,
        units: item.quantity,
        selling_price: parseFloat(item.unit_price),
        discount: 0,
        tax: 0,
        hsn: 4901, 
      }));

      const totalWeight = items.reduce(
        (sum, item) => sum + (parseFloat(item.book.weight) || 0.5) * item.quantity,
        0,
      );

      const orderDate = order.created_at || order.createdAt || new Date();
      
      // Use user name for billing if address name is just a label like 'Home' or 'Work'
      const labelNames = ['home', 'work', 'office', 'other', 'default'];
      const customerName = (shippingAddr.name && !labelNames.includes(shippingAddr.name.toLowerCase())) 
        ? shippingAddr.name 
        : (user.name || "Customer");

      // Split name into first and last name for Shiprocket
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || customerName;
      const lastName = nameParts.slice(1).join(" ") || ".";

      const payload = {
        order_id: String(order.id),
        order_date: new Date(orderDate).toISOString().replace("T", " ").substring(0, 19),
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
        channel_id: "",
        comment: "Mind Gym Book physical order",
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: shippingAddr.address_line1 || shippingAddr.street || "Main St",
        billing_address_2: shippingAddr.address_line2 || "",
        billing_city: shippingAddr.city,
        billing_pincode: String(pincode),
        billing_state: shippingAddr.state,
        billing_country: shippingAddr.country || "India",
        billing_email: user.email || "customer@example.com",
        billing_phone: shippingAddr.phone || user.phone || "0000000000",
        
        // Explicitly adding shipping fields as well
        shipping_is_billing: true,
        shipping_customer_name: firstName,
        shipping_last_name: lastName,
        shipping_address: shippingAddr.address_line1 || shippingAddr.street || "Main St",
        shipping_address_2: shippingAddr.address_line2 || "",
        shipping_city: shippingAddr.city,
        shipping_pincode: String(pincode),
        shipping_state: shippingAddr.state,
        shipping_country: shippingAddr.country || "India",
        shipping_email: user.email || "customer@example.com",
        shipping_phone: shippingAddr.phone || user.phone || "0000000000",
        
        order_items: orderItems,
        payment_method: order.payment_method?.toUpperCase() === "COD" ? "COD" : "Prepaid",
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: parseFloat(order.discount_amount || 0),
        sub_total: parseFloat(order.subtotal_amount),
        length: 10,
        breadth: 10,
        height: 10,
        weight: totalWeight > 10 ? totalWeight / 1000 : totalWeight, // Assuming >10 means it's in grams
      };

      logger.info('DEBUG: Sending final payload to Shiprocket:', payload);

      const response = await axios.post(
        `${this.baseUrl}/v1/external/orders/create/adhoc`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      ).catch(axiosError => {
        logger.error('SHIPROCKET API FULL ERROR:', axiosError.response?.data);
        throw axiosError;
      });

      const res = response.data;
      logger.info('SHIPROCKET API SUCCESS RESPONSE:', res);
      
      // Extract IDs safely from root or nested data
      const order_id = res.order_id || res.data?.order_id;
      const shipment_id = res.shipment_id || res.data?.shipment_id;
      
      return {
        order_id: order_id || null,
        shipment_id: shipment_id || null,
        status: res.status || (res.data && res.data[0]?.status) || "NEW",
        awb_code: res.awb_code || res.data?.awb_code || ""
      };
    } catch (error) {
      console.error(
        "Shiprocket Order Creation Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Shiprocket Order Failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Track order status using Shiprocket order ID.
   */
  async trackOrder(shipmentId) {
    try {
      const token = await this.getToken();
      const response = await axios.get(
        `${this.baseUrl}/v1/external/courier/track/shipment/${shipmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Shiprocket Tracking Error:",
        error.response?.data || error.message,
      );
      return null;
    }
  }

  /**
   * Cancel shipment in Shiprocket.
   */
  async cancelShipment(shipmentId) {
    try {
      const token = await this.getToken();
      const response = await axios.post(
        `${this.baseUrl}/v1/external/orders/cancel/shipment/external`,
        { shipment_id: [shipmentId] },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "Shiprocket Cancellation Error:",
        error.response?.data || error.message,
      );
      return null;
    }
  }
}

export default new ShiprocketService();
