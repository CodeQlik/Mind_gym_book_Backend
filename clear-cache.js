import { clearCachePattern } from './src/utils/redisCache.js';

async function run() {
    try {
        await clearCachePattern('books:*');
        console.log('Successfully cleared books cache!');
        process.exit(0);
    } catch (error) {
        console.error('Failed to clear cache:', error);
        process.exit(1);
    }
}

run();
