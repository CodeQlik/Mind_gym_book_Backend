import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_type: {
      type: DataTypes.ENUM("admin", "user"),
      allowNull: false,
      defaultValue: "user",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING,
    },
    additional_phone: {
      type: DataTypes.STRING,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profile: {
      type: DataTypes.JSON,
      defaultValue: {
        url: "",
        public_id: "",
        initials: "",
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },

    address_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subscription_status: {
      type: DataTypes.ENUM("active", "inactive", "expired"),
      defaultValue: "inactive",
    },
    subscription_plan: {
      type: DataTypes.ENUM("free", "monthly", "yearly", "gold"),
      defaultValue: "free",
    },
    subscription_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "users",
  },
);

export default User;
