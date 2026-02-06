import { Sequelize } from 'sequelize';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const sequelize = new Sequelize(
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    {
        host: DB_HOST,
        dialect: 'mysql',
        logging: false,
    }
);

const connectDB = async () => {
    try {
        const connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
        await connection.end();

        await sequelize.authenticate();
        console.log(`MySQL Database "${DB_NAME}" Connected Successfully via Sequelize`);

        // Convert address_id from INT to JSON to avoid "Incorrect integer value" error
        try {
            const [results] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'address_id'");
            if (results.length > 0 && results[0].Type.toLowerCase().includes('int')) {
                // Drop foreign key if it exists (usually users_ibfk_1)
                try { await sequelize.query("ALTER TABLE users DROP FOREIGN KEY users_ibfk_1"); } catch (e) { }
                await sequelize.query("ALTER TABLE users MODIFY address_id JSON");
                console.log('Converted address_id column to JSON format');
            }
        } catch (e) { }

    } catch (error) {
        console.error('Unable to connect to the database:', error.message);
    }
};

connectDB();

export default sequelize;
