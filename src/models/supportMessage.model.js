import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SupportMessage = sequelize.define(
  "SupportMessage",
  {
    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "support_tickets",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    sender_role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachments: {
      type: DataTypes.JSON, // For Cloudinary URLs array
      allowNull: true,
    },
  },
  {
    tableName: "support_messages",
    underscored: true,
    timestamps: true,
  },
);

export default SupportMessage;
