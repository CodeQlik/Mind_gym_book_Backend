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

    title: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Title cannot be empty" },
        notNull: { msg: "Title is required" },
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    chapter_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    book_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "user_annotations",
  },
);

export default UserAnnotation;
