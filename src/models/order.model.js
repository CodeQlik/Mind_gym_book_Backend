import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    // Address snapshot at time of order (denormalized for reliability)
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Link to user's address record (optional convenience FK)
    address_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "addresses", key: "id" },
    },
    subtotal_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    coupon_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "coupons", key: "id" },
    },
    order_type: {
      type: DataTypes.ENUM("physical_book", "marketplace_book"),
      allowNull: false,
      defaultValue: "physical_book",
    },
    payment_status: {
      type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
      defaultValue: "pending",
    },
    delivery_status: {
      type: DataTypes.ENUM(
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ),
      defaultValue: "processing",
    },
    // Razorpay order ID linked to this physical order
    razorpay_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tracking_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    courier_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tracking_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dispatch_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refund_requested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    refund_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Payment method chosen by user: upi | card | prepaid | cod
    payment_method: {
      type: DataTypes.ENUM("upi", "card", "prepaid", "cod"),
      allowNull: false,
      defaultValue: "prepaid",
    },
    // Virtual field to display ID as "ORD-000001"
    order_no: {
      type: DataTypes.VIRTUAL,
      get() {
        const id = this.getDataValue("id");
        return id ? `ORD-${id.toString().padStart(6, "0")}` : null;
      },
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "orders",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export default Order;
