import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserNote = sequelize.define(
  "UserNote",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id", // 🔥 DB column mapping
    },

    title: {
      type: DataTypes.STRING,
    },

    notes: {
      type: DataTypes.TEXT,
    },

    chapterName: {
      type: DataTypes.STRING,
      field: "chapter_name", // 🔥 mapping
    },

    bookName: {
      type: DataTypes.STRING,
      field: "book_name", // 🔥 mapping
    },
  },
  {
    tableName: "user_notes",
    timestamps: true,
    underscored: true,
  },
);

export default UserNote;
