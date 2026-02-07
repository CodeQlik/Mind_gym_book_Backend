import { Address, User } from '../models/index.js';

class AddressService {
    async addAddress(userId, addressData) {
        const address = await Address.create(addressData);

        const user = await User.findByPk(userId);

        const currentAddresses = Array.isArray(user.address_ids) ? user.address_ids : [];

        const updatedAddresses = [...currentAddresses, address.id];

        await User.update(
            { address_ids: updatedAddresses },
            { where: { id: userId } }
        );

        return address;
    }

    async getUserAddresses(userId) {
        const user = await User.findByPk(userId);
        if (!user || !Array.isArray(user.address_ids) || user.address_ids.length === 0) {
            return [];
        }

        const addresses = await Address.findAll({
            where: {
                id: user.address_ids
            }
        });
        return addresses;
    }



    async getAddressById(addressId) {
        return await Address.findByPk(addressId);
    }

    async updateAddress(addressId, addressData) {
        const address = await Address.findByPk(addressId);
        if (!address) {
            throw new Error("Address not found");
        }
        return await address.update(addressData);
    }

    async deleteAddress(userId, addressId) {
        const address = await Address.findByPk(addressId);
        if (!address) {
            throw new Error("Address not found");
        }

        await address.destroy();

        const user = await User.findByPk(userId);
        if (user && Array.isArray(user.address_ids)) {
            const updatedAddresses = user.address_ids.filter(id => id !== parseInt(addressId));
            await user.update({ address_ids: updatedAddresses });
        }

        return true;
    }

}

export default new AddressService();
