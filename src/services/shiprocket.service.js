import axios from "axios";
import { redisClient } from "../config/redis.js";
import logger from "../utils/logger.js"; // Assuming a logger utility

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

      let cachedToken = null;
      try {
        if (redisClient.isOpen) {
          cachedToken = await redisClient.get("shiprocket_token");
        }
      } catch (e) {
        logger.warn("Redis Token Retrieval Skipped (Client Closed or Error)");
      }

      if (cachedToken) return cachedToken;

      const response = await axios.post(
        `${this.baseUrl}/v1/external/auth/login`,
        { email, password },
      );

      if (!response.data || !response.data.token) {
        throw new Error("Invalid response from Shiprocket API");
      }

      const token = response.data.token;
      try {
        if (redisClient.isOpen) {
          await redisClient.set("shiprocket_token", token, {
            EX: 9 * 24 * 60 * 60,
          });
        }
      } catch (e) {
        logger.warn("Redis Token Save Failed (Client Closed or Error)");
      }
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

      logger.info("DEBUG: Input address object:", address);
      // Ensure address is a clean object
      let shippingAddr = address;
      if (typeof address === "string" && address.startsWith("{")) {
        try {
          shippingAddr = JSON.parse(address);
          logger.info("DEBUG: Parsed address from string");
        } catch (e) {
          logger.error("DEBUG: Failed to parse address string", e);
        }
      }
      logger.info("DEBUG: Resolved shippingAddr final:", shippingAddr);

      // Fallback: If address object is missing or incomplete, try to use the snapshot string from the order
      if (
        !shippingAddr ||
        !shippingAddr.city ||
        !(shippingAddr.pincode || shippingAddr.pin_code)
      ) {
        if (order.shipping_address) {
          const parts = order.shipping_address.split(",").map((p) => p.trim());
          // Format usually: [Name (Optional)], Street, Apt, City, State - Pincode, Country
          // Example: 'Home, 123 Main Street, Apt 4B, Mumbai, Maharashtra - 400001, India'

          shippingAddr = {
            name: parts[0] || user?.name || "Customer",
            address_line1: parts[1] || order.shipping_address, // Fallback to full string if specific part is missing
            address_line2: parts[2] || "",
            city: parts[3] || "City",
            state: "State",
            pincode: "000000",
            country: "India",
          };

          // Try to extract State and Pincode'
          const statePinPart = parts.find((p) => p.includes("-"));
          if (statePinPart) {
            const [st, pin] = statePinPart.split("-").map((p) => p.trim());
            shippingAddr.state = st;
            shippingAddr.pincode = pin;
          }

          // Try to get City (usually before the state-pin part)
          const statePinIdx = parts.findIndex((p) => p.includes("-"));
          if (statePinIdx > 0) {
            shippingAddr.city = parts[statePinIdx - 1];
          }
        }
      }

      // Check if address fields are present
      const pincode = shippingAddr?.pincode || shippingAddr?.pin_code;
      if (
        !shippingAddr ||
        !shippingAddr.city ||
        !pincode ||
        !shippingAddr.state
      ) {
        throw new Error(
          "Please add billing/shipping address first (Incomplete data)",
        );
      }

      // Prepare items for Shiprocket
      const orderItems = items.map((item) => {
        const qty = parseInt(item.quantity) || 1;
        // Shiprocket's selling_price should be the unit price inclusive of tax
        // to ensure the grand total matches the app's calculation.
        const sellingPrice = parseFloat(
          item.unit_price || item.subtotal / qty,
        ).toFixed(2);
        const taxRate = parseFloat(item.tax_rate || 0).toFixed(2);

        return {
          name: item.book?.title || "Book",
          sku: `BOOK-${item.book_id || item.book?.id}`,
          units: qty,
          selling_price: sellingPrice,
          discount: 0,
          tax: taxRate, // Shiprocket calculates tax based on this rate
          hsn: 4901,
        };
      });

      const totalWeight = items.reduce(
        (sum, item) =>
          sum + (parseFloat(item.book?.weight) || 0.5) * item.quantity,
        0,
      );

      const orderDate = order.created_at || order.createdAt || new Date();

      // Use user name for billing if address name is just a label like 'Home' or 'Work'
      const labelNames = ["home", "work", "office", "other", "default"];
      const customerName =
        shippingAddr.name &&
        !labelNames.includes(shippingAddr.name.toLowerCase())
          ? shippingAddr.name
          : user.name || "Customer";

      // Split name into first and last name for Shiprocket
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || customerName;
      const lastName = nameParts.slice(1).join(" ") || ".";

      const payload = {
        order_id: String(order.id),
        order_date: new Date(orderDate)
          .toISOString()
          .replace("T", " ")
          .substring(0, 19),
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
        channel_id: "",
        comment: "Mind Gym Book physical order",
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address:
          shippingAddr.address_line1 || shippingAddr.street || "Main St",
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
        shipping_address:
          shippingAddr.address_line1 || shippingAddr.street || "Main St",
        shipping_address_2: shippingAddr.address_line2 || "",
        shipping_city: shippingAddr.city,
        shipping_pincode: String(pincode),
        shipping_state: shippingAddr.state,
        shipping_country: shippingAddr.country || "India",
        shipping_email: user.email || "customer@example.com",
        shipping_phone: shippingAddr.phone || user.phone || "0000000000",

        order_items: orderItems,
        payment_method:
          order.payment_method?.toUpperCase() === "COD" ? "COD" : "Prepaid",
        shipping_charges: parseFloat(order.shipping_charge || 0),
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: parseFloat(order.discount_amount || 0),
        // sub_total should only be the sum of items (inclusive of tax)
        // Since order.total_tax now includes shipping tax, we sum item subtotals directly
        sub_total: items.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0).toFixed(2),
        length: 10,
        breadth: 10,
        height: 10,
        weight:
          parseFloat(totalWeight) > 15
            ? (parseFloat(totalWeight) / 1000).toFixed(3)
            : parseFloat(totalWeight).toFixed(3),
      };

      logger.info("DEBUG: Sending final payload to Shiprocket:", payload);

      const response = await axios
        .post(`${this.baseUrl}/v1/external/orders/create/adhoc`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        .catch((axiosError) => {
          logger.error("SHIPROCKET API FULL ERROR:", axiosError.response?.data);
          throw axiosError;
        });

      const res = response.data;
      logger.info("SHIPROCKET API SUCCESS RESPONSE:", res);

      // Extract IDs safely from root or nested data
      const order_id = res.order_id || res.data?.order_id;
      const shipment_id = res.shipment_id || res.data?.shipment_id;

      return {
        order_id: order_id || null,
        shipment_id: shipment_id || null,
        status: res.status || (res.data && res.data[0]?.status) || "NEW",
        awb_code: res.awb_code || res.data?.awb_code || "",
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
   * Calculate shipping cost using Shiprocket serviceability API.
   * Returns estimated freight charges.
   */
  async getShippingCost(params) {
    try {
      const {
        delivery_pincode,
        weight,
        cod = 0,
        order_amount = 500,
        pickup_pincode = process.env.SHIPROCKET_PICKUP_PINCODE || "302004",
      } = params;

      const token = await this.getToken();

      // Normalize weight: Shiprocket expects KG.
      // If weight is > 15, assume it's in grams (common for books) and convert to KG.
      const finalWeight =
        parseFloat(weight) > 15
          ? (parseFloat(weight) / 1000).toFixed(3)
          : parseFloat(weight).toFixed(3);

      logger.info(
        `SHIPROCKET: Checking serviceability to ${delivery_pincode}, weight ${finalWeight}kg`,
      );

      const response = await axios.get(
        `${this.baseUrl}/v1/external/courier/serviceability/`,
        {
          params: {
            pickup_postcode: pickup_pincode,
            delivery_postcode: delivery_pincode,
            weight: finalWeight,
            cod,
            order_amount,
          },
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const serviceabilityData = response.data.data;
      if (
        serviceabilityData &&
        serviceabilityData.available_courier_companies?.length > 0
      ) {
        // Return the first available courier's full charge details
        const bestMatch = serviceabilityData.available_courier_companies[0];
        const total = parseFloat(bestMatch.rate || bestMatch.freight_charge || 50);
        
        // India standard: 18% GST on shipping services
        const base = parseFloat((total / 1.18).toFixed(2));
        const tax = parseFloat((total - base).toFixed(2));

        logger.info(
          `SHIPROCKET: Calculated dynamic charge for ${delivery_pincode} is Total:${total}, Base:${base}`,
        );
        return { total, base, tax };
      }

      logger.warn(
        `SHIPROCKET: No courier available for ${delivery_pincode}, fallback to 50.`,
      );
      return { total: 50, base: 47.62, tax: 2.38 }; // Fallback assuming 5% tax if unavailable or matched
    } catch (error) {
      logger.error(
        "Shiprocket Serviceability Error:",
        error.response?.data || error.message,
      );
      // Return fallback
      return { total: 50, base: 47.62, tax: 2.38 };
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

  /**
   * Assign an AWB to a shipment.
   */
  async assignAWB(shipmentId, courierId = null) {
    try {
      const token = await this.getToken();
      const payload = { shipment_id: shipmentId };
      if (courierId) payload.courier_id = courierId;

      const response = await axios.post(
        `${this.baseUrl}/v1/external/courier/assign/awb`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Shiprocket AWB Assignment Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `AWB Assignment Failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Schedule a pickup for a shipment.
   */
  async schedulePickup(shipmentId) {
    try {
      const token = await this.getToken();
      const response = await axios.post(
        `${this.baseUrl}/v1/external/courier/generate/pickup`,
        { shipment_id: [shipmentId] },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Shiprocket Pickup Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Pickup Scheduling Failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Generate a shipping label (PDF URL) for a shipment.
   */
  async generateLabel(shipmentId) {
    try {
      const token = await this.getToken();
      const response = await axios.post(
        `${this.baseUrl}/v1/external/courier/generate/label`,
        { shipment_id: [shipmentId] },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      logger.error(
        "Shiprocket Label Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Label Generation Failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Generate and Print Manifest for a shipment.
   */
  async generateManifest(shipmentId) {
    try {
      const token = await this.getToken();
      // Generate Manifest
      const genResponse = await axios.post(
        `${this.baseUrl}/v1/external/manifests/generate`,
        { shipment_id: [shipmentId] },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!genResponse.data || genResponse.data.status !== 1) {
        return genResponse.data;
      }

      // Print Manifest (Get URL)
      const printResponse = await axios.post(
        `${this.baseUrl}/v1/external/manifests/print`,
        { shipment_id: [shipmentId] },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return {
        manifest_url: printResponse.data?.manifest_url || null,
        ...genResponse.data,
      };
    } catch (error) {
      logger.error(
        "Shiprocket Manifest Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        `Manifest Generation Failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }
}

export default new ShiprocketService();
