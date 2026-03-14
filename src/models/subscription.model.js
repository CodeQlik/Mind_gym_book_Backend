import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Subscription = sequelize.define(
  "Subscription",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    plan_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "plans",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    plan_type: {
      type: DataTypes.ENUM(
        "monthly",
        "annual",
        "one_month",
        "three_month",
        "one_year",
        "free",
        "premium",
        "",
      ),
      allowNull: false,
      defaultValue: "free",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },

    payment_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_record_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "payments",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "expired", "failed", "inactive"),
      defaultValue: "pending",
    },
    start_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    razorpay_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    books_read_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "subscriptions",
  },
);

export default Subscription;
