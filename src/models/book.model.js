import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Book = sequelize.define(
  "Book",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    original_price: {
      type: DataTypes.DECIMAL(10, 2),
    },
    condition: {
      type: DataTypes.ENUM("new", "fair", "good", "acceptable"),
      defaultValue: "good",
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    thumbnail: {
      type: DataTypes.JSON,
      defaultValue: { url: "", public_id: "" },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "categories", key: "id" },
    },
    subcategory_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "subcategories", key: "id" },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    published_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "books",
  },
);

export default Book;
