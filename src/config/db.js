import { Sequelize } from "sequelize";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: "mysql",
  logging: false,
});

const connectDB = async () => {
  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await connection.end();

    await sequelize.authenticate();
    console.log(
      `MySQL Database "${DB_NAME}" Connected Successfully via Sequelize`,
    );
  } catch (error) {
    console.error("Unable to connect to the database:", error.message);
  }
};

// Initial connection handled in index.js  dfdfdfd
export { connectDB };

export default sequelize;
