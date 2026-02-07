import User from './user.model.js';
import Address from './address.model.js';
import Category from './category.model.js';

// Link for the primary/default address - Commented out because we are using address_ids JSON
// User.belongsTo(Address, { foreignKey: 'address_id', as: 'primaryAddress' });
// Address.hasOne(User, { foreignKey: 'address_id' });


export {
    User,
    Address,
    Category
};
