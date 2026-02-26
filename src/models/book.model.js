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
    pdf_file: {
      type: DataTypes.JSON,
      defaultValue: { url: "", public_id: "" },
      allowNull: true,
      get() {
        const rawValue = this.getDataValue("pdf_file");
        try {
          return typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        } catch (e) {
          return rawValue;
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
    otherdescription: {
      type: DataTypes.TEXT,
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
