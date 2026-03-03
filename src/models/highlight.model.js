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
      onDelete: "CASCADE",
    },

    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "books", key: "id" },
      onDelete: "CASCADE",
    },

    page_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    color: {
      type: DataTypes.STRING,
      defaultValue: "#FFFF00",
    },

    rect_x: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    rect_y: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    rect_width: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    rect_height: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    underscored: true,
    tableName: "highlights",
    indexes: [
      { fields: ["user_id", "book_id"] },
      { fields: ["book_id", "page_number"] },
      { fields: ["user_id", "book_id", "page_number"] },
    ],
  },
);

export default Highlight;
