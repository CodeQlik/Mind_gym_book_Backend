import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserAnnotation = sequelize.define(
  "UserAnnotation",
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
    highlight_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    page_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: "#FFFF00", // Default yellow highlight
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "user_annotations",
  },
);

export default UserAnnotation;
