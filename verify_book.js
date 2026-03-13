
import { Book } from './src/models/index.js';
import sequelize from './src/config/db.js';

async function verify() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const slug = 'eveniet-ipsam-adipi';
    const book = await Book.findOne({ where: { slug } });
    
    if (book) {
      console.log('Book found:');
      console.log(JSON.stringify(book.toJSON(), null, 2));
    } else {
      console.log('Book NOT found with slug:', slug);
      
      const allBooks = await Book.findAll({ limit: 5 });
      console.log('Recent books in DB:');
      allBooks.forEach(b => console.log(`- ${b.title} (slug: ${b.slug}, active: ${b.is_active})`));
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

verify();
