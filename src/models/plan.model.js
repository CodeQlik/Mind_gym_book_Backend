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
      type: DataTypes.ENUM("one_month", "three_month", "one_year", "free"),
      allowNull: false,
    },
    duration_months: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "plans",
  },
);

export default Plan;
