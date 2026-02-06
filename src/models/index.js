import User from './user.model.js';
import Address from './address.model.js';

User.belongsTo(Address, { foreignKey: 'address_id', as: 'userAddress' });
Address.hasOne(User, { foreignKey: 'address_id' });

export {
    User,
    Address
};
