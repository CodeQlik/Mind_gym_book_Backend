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
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
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
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "orders",
  },
);

export default Order;
