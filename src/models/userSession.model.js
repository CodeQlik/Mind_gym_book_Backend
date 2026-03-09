import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const UserSession = sequelize.define(
  "UserSession",
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
    device_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    device_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Unknown Device",
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    last_active: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "user_sessions",
  },
);

export default UserSession;
