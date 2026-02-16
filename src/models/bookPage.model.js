import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const BookPage = sequelize.define(
  "BookPage",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "books",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    page_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    audio_file: {
      type: DataTypes.JSON,
      defaultValue: { url: "", public_id: "" },
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "book_pages",
    indexes: [
      {
        unique: true,
        fields: ["book_id", "page_number"],
      },
    ],
  },
);

export default BookPage;
