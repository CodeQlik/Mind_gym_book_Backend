import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Address = sequelize.define(
    "Address",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        street: {
            type: DataTypes.STRING,
            allowNull: false
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false
        },
        state: {
            type: DataTypes.STRING,
            allowNull: false
        },
        pin_code: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        country: {
            type: DataTypes.STRING,
            defaultValue: "India"
        },
        addresstype: {
            type: DataTypes.ENUM('home', 'work', 'other'),
            allowNull: false
        }
    },
    {
        timestamps: true,
        underscored: true,
        tableName: 'addresses'
    }
);

export default Address;
