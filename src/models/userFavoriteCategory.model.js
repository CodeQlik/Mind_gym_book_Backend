import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserFavoriteCategory = sequelize.define(
  "UserFavoriteCategory",
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
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "categories", key: "id" },
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "user_favorite_categories",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "category_id"],
      },
    ],
  },
);

export default UserFavoriteCategory;
