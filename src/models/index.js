import User from './user.model.js';
import Address from './address.model.js';
import Category from './category.model.js';
import Book from './book.model.js';

// Associations
Category.hasMany(Book, { foreignKey: 'category_id', as: 'books' });
Book.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

export {
    User,
    Address,
    Category,
    Book
};
