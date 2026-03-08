import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Coupon = sequelize.define(
  "Coupon",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue("code", value.toUpperCase());
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    discount_type: {
      type: DataTypes.ENUM("percentage", "fixed"),
      allowNull: false,
      defaultValue: "percentage",
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    min_order_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    max_discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true, // For percentage discounts
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      defaultValue: null, // null for unlimited
    },
    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "coupons",
  },
);

export default Coupon;
