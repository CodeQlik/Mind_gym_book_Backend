import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const ReadingProgress = sequelize.define(
  "ReadingProgress",
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
    last_page: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    total_pages: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    percentage_complete: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    last_read_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "reading_progress",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "book_id"],
      },
    ],
  },
);

export default ReadingProgress;
