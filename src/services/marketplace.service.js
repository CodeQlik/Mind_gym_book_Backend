import { Seller, UsedBookListing, Order, User } from "../models/index.js";
import { Op } from "sequelize";

class MarketplaceService {
  // --- Seller Methods ---

  async registerAsSeller(userId, sellerData) {
    const existingSeller = await Seller.findOne({ where: { user_id: userId } });
    if (existingSeller) {
      throw new Error("You are already registered as a seller");
    }

    return await Seller.create({
      user_id: userId,
      ...sellerData,
      status: "pending",
    });
  }

  async getSellerProfile(userId) {
    return await Seller.findOne({
      where: { user_id: userId },
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
    });
  }

  async updateSellerStatus(sellerId, status) {
    const seller = await Seller.findByPk(sellerId);
    if (!seller) throw new Error("Seller not found");
    return await seller.update({ status });
  }

  async getAllSellers(status = null) {
    const where = status ? { status } : {};
    return await Seller.findAll({
      where,
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
    });
  }

  // --- Listing Methods ---

  async createListing(sellerId, listingData, images = []) {
    const seller = await Seller.findByPk(sellerId);
    if (!seller || seller.status !== "approved") {
      throw new Error("Only approved sellers can create listings");
    }

    return await UsedBookListing.create({
      seller_id: sellerId,
      ...listingData,
      images,
      status: "pending",
    });
  }

  async getListings(status = "active") {
    return await UsedBookListing.findAll({
      where: { status },
      include: [
        {
          model: Seller,
          as: "seller",
          include: [{ model: User, as: "user", attributes: ["name"] }],
        },
      ],
    });
  }

  async getSellerListings(sellerId) {
    return await UsedBookListing.findAll({
      where: { seller_id: sellerId },
    });
  }

  async updateListingStatus(listingId, status) {
    const listing = await UsedBookListing.findByPk(listingId);
    if (!listing) throw new Error("Listing not found");
    return await listing.update({ status });
  }

  // --- Escrow & Commission ---

  async processMarketplaceOrder(userId, listingId, shippingAddress) {
    const listing = await UsedBookListing.findByPk(listingId);
    if (!listing || listing.status !== "active") {
      throw new Error("Listing not available");
    }

    const order = await Order.create({
      user_id: userId,
      total_amount: listing.price,
      order_type: "marketplace_book",
      payment_status: "paid", // Assuming payment handled by generic payment flow
      delivery_status: "processing",
      escrow_status: "held",
      shipping_address: shippingAddress,
    });

    // Mark listing as sold
    await listing.update({ status: "sold" });

    return order;
  }

  async releaseEscrow(orderId) {
    const order = await Order.findOne({
      where: { id: orderId, order_type: "marketplace_book" },
    });
    if (!order) throw new Error("Order not found");
    if (order.escrow_status !== "held")
      throw new Error("Escrow is not in 'held' state");

    // Logic for calculating commission could go here
    const commissionRate = 0.05; // 5%
    const commission = order.total_amount * commissionRate;
    const sellerPayout = order.total_amount - commission;

    await order.update({ escrow_status: "released" });

    return {
      orderId: order.id,
      payout: sellerPayout,
      commission: commission,
    };
  }
}

export default new MarketplaceService();
