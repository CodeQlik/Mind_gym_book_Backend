import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UsedBookListing = sequelize.define(
  "UsedBookListing",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "sellers", key: "id" },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
    },
    condition: {
      type: DataTypes.ENUM("like-new", "good", "acceptable"),
      defaultValue: "good",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    images: {
      type: DataTypes.JSON, // Array of URLs
      allowNull: true,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "sold", "rejected"),
      defaultValue: "pending",
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "used_book_listings",
  },
);

export default UsedBookListing;
