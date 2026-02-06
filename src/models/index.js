import User from './user.model.js';
import Address from './address.model.js';

// Link for the primary/default address
User.belongsTo(Address, { foreignKey: 'address_id', as: 'primaryAddress' });
Address.hasOne(User, { foreignKey: 'address_id' });


export {
    User,
    Address
};
