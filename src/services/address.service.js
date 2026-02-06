import { Address, User } from '../models/index.js';

class AddressService {
    async addAddress(userId, addressData) {
        // Create the new address
        const address = await Address.create(addressData);

        // Fetch user to get current address list
        const user = await User.findByPk(userId);

        // Ensure address_ids is an array
        const currentAddresses = Array.isArray(user.address_ids) ? user.address_ids : [];

        // Add new address ID to the list
        const updatedAddresses = [...currentAddresses, address.id];

        // Update user
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

        // Fetch all addresses whose IDs are in the user's address_ids array
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

        // Delete the address record
        await address.destroy();

        // Update the user's address_ids list
        const user = await User.findByPk(userId);
        if (user && Array.isArray(user.address_ids)) {
            const updatedAddresses = user.address_ids.filter(id => id !== parseInt(addressId));
            await user.update({ address_ids: updatedAddresses });
        }

        return true;
    }






}

export default new AddressService();
