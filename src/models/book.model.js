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
      defaultValue: 0,
    },
    reserved: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Available stock calculated as (Total Stock - Reserved)
    available: {
      type: DataTypes.VIRTUAL,
      get() {
        const stock = this.getDataValue("stock") || 0;
        const reserved = this.getDataValue("reserved") || 0;
        return Math.max(0, stock - reserved);
      },
    },

    is_bestselling: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_trending: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    cover_image: {
      type: DataTypes.JSON,
      defaultValue: { url: "", public_id: "" },
      get() {
        const rawValue = this.getDataValue("cover_image");
        try {
          return typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        } catch (e) {
          return rawValue;
        }
      },
    },
    highlights: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
      get() {
        const rawValue = this.getDataValue("images");
        try {
          return typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        } catch (e) {
          return rawValue;
        }
      },
    },

    thumbnail: {
      type: DataTypes.JSON,
      defaultValue: { url: "", public_id: "" },
      get() {
        const rawValue = this.getDataValue("thumbnail");
        try {
          return typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        } catch (e) {
          return rawValue;
        }
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "categories", key: "id" },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    published_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    file_data: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      get() {
        const value = this.getDataValue("file_data");
        try {
          return typeof value === "string" ? JSON.parse(value) : value;
        } catch (e) {
          return value || null;
        }
      },
    },
    is_premium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isbn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    page_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    previewPages: {
      type: DataTypes.INTEGER,
      defaultValue: 5, // Default 5 pages free preview
    },
    dimensions: {
      type: DataTypes.STRING, // e.g. "8 x 5 x 1 inches"
      allowNull: true,
    },
    weight: {
      type: DataTypes.FLOAT, // numeric value
      allowNull: true,
    },
    audio_file: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      get() {
        const value = this.getDataValue("audio_file");
        try {
          return typeof value === "string" ? JSON.parse(value) : value;
        } catch (e) {
          return value || null;
        }
      },
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "books",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export default Book;
