import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const BookPdfChunk = sequelize.define(
  "BookPdfChunk",
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
    chunk_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.BLOB("long"), // Use LONGBLOB for large chunks
      allowNull: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "book_pdf_chunks",
    indexes: [
      {
        unique: true,
        fields: ["book_id", "chunk_index"],
      },
    ],
  },
);

export default BookPdfChunk;
