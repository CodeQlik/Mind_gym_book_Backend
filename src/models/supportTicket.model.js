import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SupportTicket = sequelize.define(
  "SupportTicket",
  {
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "orders",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("open", "in_progress", "resolved", "closed"),
      defaultValue: "open",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
    },
    ticket_no: {
      type: DataTypes.STRING,
      unique: true,
    },
  },
  {
    tableName: "support_tickets",
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: async (ticket) => {
        const count = await sequelize.models.SupportTicket.count();
        ticket.ticket_no = `TKT-${String(count + 1).padStart(6, "0")}`;
      },
    },
  },
);

export default SupportTicket;
