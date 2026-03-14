import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Setting = sequelize.define(
  "Setting",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    site_name: {
      type: DataTypes.STRING,
      defaultValue: "Mind Gym Book",
    },
    logo: {
      type: DataTypes.JSON, // To store Cloudinary URL and public_id
      allowNull: true,
    },
    favicon: {
      type: DataTypes.JSON, // To store Cloudinary URL and public_id
      allowNull: true,
    },
    contact_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    copyright_text: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "settings",
  },
);

export default Setting;
