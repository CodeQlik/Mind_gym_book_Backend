// models/Product.js

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Book = sequelize.define(
    "Book",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },

        // author: {
        //   type: DataTypes.STRING,
        //   allowNull: false,
        // },

        description: {
            type: DataTypes.TEXT,
        },

        // publisher: {
        //   type: DataTypes.STRING,
        // },

        // edition: {
        //   type: DataTypes.STRING,
        // },

        // language: {
        //   type: DataTypes.STRING,
        // },

        // pages: {
        //   type: DataTypes.INTEGER,
        // },

        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        // original_price: {
        //   type: DataTypes.DECIMAL(10, 2),
        // },

        // condition: {
        //   type: DataTypes.ENUM("new", "like_new", "good", "acceptable"),
        //   allowNull: false,
        // },

        // stock: {
        //   type: DataTypes.INTEGER,
        //   defaultValue: 1,
        // },

        thumbnail: {
            type: DataTypes.JSON,
            defaultValue: {
                url: "",
                public_id: ""
            }
        },

        // images: {
        //   type: DataTypes.JSON, // multiple image URLs
        // },

        // tags: {
        //   type: DataTypes.JSON, 
        // },

        // best_selling: {
        //   type: DataTypes.BOOLEAN,
        //   defaultValue: false,
        // },

        // popular: {
        //   type: DataTypes.BOOLEAN,
        //   defaultValue: false,
        // },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },

        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        timestamps: true,
        tableName: "books",
    }
);

export default Book;
