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
    title: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "user_annotations",
  },
);

export default UserAnnotation;
