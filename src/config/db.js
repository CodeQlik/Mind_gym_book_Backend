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
            // Check for columns
            const [columns] = await sequelize.query("SHOW COLUMNS FROM users");
            const hasOldCol = columns.some(c => c.Field === 'address_id');
            const hasNewCol = columns.some(c => c.Field === 'address_ids');
            const newColInfo = columns.find(c => c.Field === 'address_ids');

            if (hasOldCol) {
                if (hasNewCol) {
                    console.log('Both address_id and address_ids exist. Dropping address_id...');
                    try { await sequelize.query("ALTER TABLE users DROP FOREIGN KEY users_ibfk_1"); } catch (e) { }
                    await sequelize.query("ALTER TABLE users DROP COLUMN address_id");
                } else {
                    console.log('Renaming address_id to address_ids and converting to JSON...');
                    try { await sequelize.query("ALTER TABLE users DROP FOREIGN KEY users_ibfk_1"); } catch (e) { }
                    await sequelize.query("ALTER TABLE users CHANGE address_id address_ids JSON");
                }
            } else if (hasNewCol && !newColInfo.Type.toLowerCase().includes('json')) {
                console.log('Converting address_ids to JSON...');
                await sequelize.query("ALTER TABLE users MODIFY address_ids JSON");
            }

            // 2. Handle reset password columns
            const hasResetToken = columns.some(c => c.Field === 'reset_password_token');
            if (!hasResetToken) {
                console.log('Adding missing reset_password_token column...');
                await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) NULL");
            }

            const hasResetExpiry = columns.some(c => c.Field === 'reset_password_expiry');
            if (!hasResetExpiry) {
                console.log('Adding missing reset_password_expiry column...');
                await sequelize.query("ALTER TABLE users ADD COLUMN reset_password_expiry DATETIME NULL");
            }
        } catch (e) {
            console.log('Auto-migration log error:', e.message);
        }



    } catch (error) {
        console.error('Unable to connect to the database:', error.message);
    }
};

connectDB();

export default sequelize;
