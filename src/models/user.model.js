import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const User = sequelize.define(
    "User",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_type: {
            type: DataTypes.ENUM("admin", "user"),
            allowNull: false,
            defaultValue: "user"
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        phone: {
            type: DataTypes.STRING
        },
        additional_phone: {
            type: DataTypes.STRING
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        profile: {
            type: DataTypes.JSON,
            defaultValue: {
                url: "",
                public_id: "",
                initials: ""
            }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },

        address_ids: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        reset_password_token: {
            type: DataTypes.STRING,
            allowNull: true
        },
        reset_password_expiry: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        timestamps: true,
        underscored: true,
        tableName: 'users'
    }
);

export default User;
