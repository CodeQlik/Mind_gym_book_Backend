import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Highlight = sequelize.define(
  "Highlight",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "books", key: "id" },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: "#FFFF00", // Yellow default
    },
    page_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    cfi_range: {
      type: DataTypes.STRING, // For EPUB position sync
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "highlights",
  },
);

export default Highlight;
