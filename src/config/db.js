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

        try {
            const [oldCol] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'address_id'");
            const [newCol] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'address_ids'");

            if (oldCol.length > 0) {
                console.log('Renaming address_id to address_ids and converting to JSON...');
                try { await sequelize.query("ALTER TABLE users DROP FOREIGN KEY users_ibfk_1"); } catch (e) { }
                await sequelize.query("ALTER TABLE users CHANGE address_id address_ids JSON");
            } else if (newCol.length > 0 && newCol[0].Type.toLowerCase().includes('int')) {
                console.log('Converting address_ids to JSON...');
                await sequelize.query("ALTER TABLE users MODIFY address_ids JSON");
            }

            // 2. Handle reset password columns
            const [resetTokenCol] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'reset_password_token'");
            if (resetTokenCol.length === 0) {
                console.log('Adding missing reset_password_token column...');
                await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) NULL");
            }

            const [resetExpiryCol] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'reset_password_expiry'");
            if (resetExpiryCol.length === 0) {
                console.log('Adding missing reset_password_expiry column...');
                await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_expiry DATETIME NULL");
            }
        } catch (e) {
            console.log('Auto-migration log:', e.message);
        }



    } catch (error) {
        console.error('Unable to connect to the database:', error.message);
    }
};

connectDB();

export default sequelize;
