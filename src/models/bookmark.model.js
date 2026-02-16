import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Bookmark = sequelize.define(
  "Bookmark",
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
    page_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "bookmarks",
  },
);

export default Bookmark;
