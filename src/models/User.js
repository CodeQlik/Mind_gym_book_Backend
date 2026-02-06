import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Address from "./Address.js";

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

        business_name: {
            type: DataTypes.STRING,
            field: 'business_name'
        },
        business_email: {
            type: DataTypes.STRING,
            field: 'business_email'
        },
        business_phone: {
            type: DataTypes.STRING,
            field: 'business_phone'
        },
        gst_number: {
            type: DataTypes.STRING,
            field: 'gst_number'
        },
        pan_number: {
            type: DataTypes.STRING,
            field: 'pan_number'
        },

        kyc_document_type: {
            type: DataTypes.STRING,
            field: 'kyc_document_type'
        },
        kyc_document_number: {
            type: DataTypes.STRING,
            field: 'kyc_document_number'
        },
        kyc_document_front: {
            type: DataTypes.STRING,
            field: 'kyc_document_front'
        },
        kyc_document_back: {
            type: DataTypes.STRING,
            field: 'kyc_document_back'
        },

        kyc_status: {
            type: DataTypes.ENUM("pending", "approved", "rejected"),
            defaultValue: "pending",
            field: 'kyc_status'
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },

        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_verified'
        },

        address_id: {
            type: DataTypes.INTEGER,
            field: 'address_id',
            references: {
                model: 'addresses',
                key: 'id'
            }
        }
    },
    {
        timestamps: true,
        underscored: true,
        tableName: 'users'
    }
);

User.belongsTo(Address, { foreignKey: 'address_id', as: 'userAddress' });
Address.hasOne(User, { foreignKey: 'address_id' });

export default User;
