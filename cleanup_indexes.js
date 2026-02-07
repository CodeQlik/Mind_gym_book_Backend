import sequelize from './src/config/db.js';

const cleanupIndexes = async () => {
    try {
        const [results] = await sequelize.query("SHOW INDEX FROM users");
        const indexesToDrop = results
            .filter(idx => idx.Key_name !== 'PRIMARY')
            .map(idx => idx.Key_name);

        // Remove duplicates from indexesToDrop (SHOW INDEX returns one row per column in composite index)
        const uniqueIndexes = [...new Set(indexesToDrop)];

        console.log(`Found ${uniqueIndexes.length} indexes to drop.`);

        for (const indexName of uniqueIndexes) {
            console.log(`Dropping index: ${indexName}`);
            try {
                // For MySQL, we need to handle foreign keys differently if the index is a FK
                // But usually these are just UNIQUE or BTREE indexes created by Sequelize
                await sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\``);
            } catch (err) {
                console.error(`Failed to drop index ${indexName}: ${err.message}`);
                // If it's a foreign key, try dropping FK first
                try {
                    await sequelize.query(`ALTER TABLE users DROP FOREIGN KEY \`${indexName}\``);
                    await sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\``);
                } catch (err2) {
                    console.error(`Also failed to drop as FK: ${err2.message}`);
                }
            }
        }

        console.log('Index cleanup complete.');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

cleanupIndexes();
