import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Audiobook = sequelize.define(
  "Audiobook",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "books",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    chapter_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    chapter_title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    narrator: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    audio_file: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { url: "", public_id: "" },
    },

    language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
    tableName: "audiobooks",
  },
);

export default Audiobook;
