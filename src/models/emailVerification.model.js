import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const EmailVerification = sequelize.define(
  "EmailVerification",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "email_verifications",
  },
);

export default EmailVerification;
