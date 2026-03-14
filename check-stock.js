import { Book } from './src/models/index.js';

async function check() {
    const books = await Book.findAll({ where: { stock: 0 } });
    console.log('Books with 0 stock:');
    books.forEach(b => {
        console.log(`- ${b.title}: is_active=${b.is_active}`);
    });
    process.exit(0);
}

check();
