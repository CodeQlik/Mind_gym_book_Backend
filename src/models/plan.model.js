import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Plan = sequelize.define(
  "Plan",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    plan_type: {
      type: DataTypes.ENUM("monthly", "annual", "free"),
      allowNull: false,
    },
    duration_months: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    device_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    book_read_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 5, // Default for free plan
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    is_ad_free: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_popular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "plans",
  },
);

export default Plan;
