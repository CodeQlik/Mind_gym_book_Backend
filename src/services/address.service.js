import { Address, User } from "../models/index.js";

class AddressService {
  async addAddress(userId, addressData) {
    const address = await Address.create(addressData);

    const user = await User.findByPk(userId);

    const currentAddresses = Array.isArray(user.address_ids)
      ? user.address_ids
      : [];

    const updatedAddresses = [...currentAddresses, address.id];

    await User.update(
      { address_ids: updatedAddresses },
      { where: { id: userId } },
    );

    return address;
  }

  async getUserAddresses(userId) {
    const user = await User.findByPk(userId);
    if (
      !user ||
      !Array.isArray(user.address_ids) ||
      user.address_ids.length === 0
    ) {
      return [];
    }

    const addresses = await Address.findAll({
      where: {
        id: user.address_ids,
      },
      order: [["createdAt", "DESC"]],
    });
    return addresses;
  }

  async getAddressesByType(userId, type) {
    const user = await User.findByPk(userId);
    if (
      !user ||
      !Array.isArray(user.address_ids) ||
      user.address_ids.length === 0
    ) {
      return [];
    }

    return await Address.findAll({
      where: {
        id: user.address_ids,
        addresstype: type,
      },
    });
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
      const updatedAddresses = user.address_ids.filter(
        (id) => id !== parseInt(addressId),
      );
      await user.update({ address_ids: updatedAddresses });
    }

    return true;
  }

  async setDefaultAddress(userId, addressId) {
    const user = await User.findByPk(userId);
    if (!user || !Array.isArray(user.address_ids)) {
      throw new Error("User or addresses not found");
    }

    const addressIdNum = parseInt(addressId);
    if (!user.address_ids.includes(addressIdNum)) {
      throw new Error("Address does not belong to this user");
    }

    // Set all user's addresses to not default
    await Address.update(
      { is_default: false },
      { where: { id: user.address_ids } },
    );

    // Set the chosen one to default
    const address = await Address.findByPk(addressId);
    if (!address) {
      throw new Error("Address not found");
    }

    return await address.update({ is_default: true });
  }
}

export default new AddressService();
