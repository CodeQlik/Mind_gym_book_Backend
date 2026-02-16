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
    plan_type: {
      type: DataTypes.ENUM("monthly", "yearly", "gold"),
      allowNull: false,
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
      type: DataTypes.ENUM("pending", "active", "expired", "failed"),
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
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "subscriptions",
  },
);

export default Subscription;
