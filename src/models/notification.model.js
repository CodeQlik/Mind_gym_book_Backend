import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Notification = sequelize.define(
  "Notification",
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
    type: {
      type: DataTypes.ENUM(
        "ORDER",
        "RENEWAL",
        "APPROVAL",
        "PRICE_DROP",
        "NEW_RELEASE",
        "SALE",
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Metadata ke liye JSON column (Book ID ya Order ID store karne ke liye)
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "notifications",
  },
);

export default Notification;
