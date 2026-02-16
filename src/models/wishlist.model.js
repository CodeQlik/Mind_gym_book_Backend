import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Wishlist = sequelize.define(
  "Wishlist",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
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
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "wishlist",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "book_id"],
      },
    ],
  },
);

export default Wishlist;
