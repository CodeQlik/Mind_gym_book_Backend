import dotenv from 'dotenv';
import sequelize from './src/config/db.js';
import { app } from './src/app.js';
import './src/models/index.js'; 
import seedAdmin from './src/seeders/admin.seeder.js';

dotenv.config();

const syncDB = async () => {
    try {
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully');

        await seedAdmin();
    } catch (error) {
        console.error('Error syncing database:', error);
    }
};

syncDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
 
