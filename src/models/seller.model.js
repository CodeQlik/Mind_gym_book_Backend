import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Seller = sequelize.define(
  "Seller",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: "users", key: "id" },
    },
    store_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bank_account_number: {
      type: DataTypes.STRING,
    },
    ifsc_code: {
      type: DataTypes.STRING,
    },
    payout_method: {
      type: DataTypes.ENUM("bank_transfer", "upi"),
      defaultValue: "bank_transfer",
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "suspended"),
      defaultValue: "pending",
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "sellers",
  },
);

export default Seller;
