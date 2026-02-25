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
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    order_type: {
      type: DataTypes.ENUM("physical_book", "marketplace_book"),
      allowNull: false,
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
    escrow_status: {
      type: DataTypes.ENUM("held", "released", "disputed", "refunded"),
      allowNull: true, // Only for marketplace
    },
    shipping_address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tracking_id: {
      type: DataTypes.STRING,
    },
    refund_requested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    refund_reason: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "orders",
  },
);

export default Order;
