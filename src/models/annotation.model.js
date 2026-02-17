import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserAnnotation = sequelize.define(
  "UserAnnotation",
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
    tableName: "user_annotations",
    timestamps: true,
    createdAt: "created_at", // 🔥 mapping
    updatedAt: "updated_at", // 🔥 mapping
  },
);

export default UserAnnotation;
