import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Payment = sequelize.define(
  "Payment",
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
    order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    payment_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: "INR",
    },
    status: {
      type: DataTypes.ENUM("created", "captured", "failed"),
      defaultValue: "created",
    },
    payment_type: {
      type: DataTypes.ENUM("subscription", "book_purchase"),
      allowNull: false,
    },
    plan_name: {
      type: DataTypes.STRING,
      allowNull: true, // only for subscriptions
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // only for book_purchase
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "payments",
  },
);

export default Payment;
