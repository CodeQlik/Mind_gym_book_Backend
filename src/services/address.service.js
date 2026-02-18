import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";

class AddressService {
  async addAddress(userId, addressData) {
    const {
      name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      country,
      addresstype,
      is_default,
    } = addressData;

    const [, meta] = await sequelize.query(
      `INSERT INTO addresses (name, phone, address_line1, address_line2, city, state, pincode, country, addresstype, is_default, created_at, updated_at)
       VALUES (:name, :phone, :address_line1, :address_line2, :city, :state, :pincode, :country, :addresstype, :is_default, NOW(), NOW())`,
      {
        replacements: {
          name: name || null,
          phone: phone || null,
          address_line1: address_line1 || null,
          address_line2: address_line2 || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          country: country || "India",
          addresstype: addresstype || "home",
          is_default: is_default ? 1 : 0,
        },
        type: QueryTypes.INSERT,
      },
    );

    const newAddressId = meta;

    // Get current user address_ids
    const [user] = await sequelize.query(
      "SELECT address_ids FROM users WHERE id = :userId LIMIT 1",
      { replacements: { userId }, type: QueryTypes.SELECT },
    );

    let currentAddresses = [];
    if (user?.address_ids) {
      try {
        currentAddresses =
          typeof user.address_ids === "string"
            ? JSON.parse(user.address_ids)
            : user.address_ids;
      } catch {
        currentAddresses = [];
      }
    }

    const updatedAddresses = [...currentAddresses, newAddressId];

    await sequelize.query(
      "UPDATE users SET address_ids = :address_ids, updated_at = NOW() WHERE id = :userId",
      {
        replacements: { address_ids: JSON.stringify(updatedAddresses), userId },
        type: QueryTypes.UPDATE,
      },
    );

    const [address] = await sequelize.query(
      "SELECT * FROM addresses WHERE id = :id LIMIT 1",
      { replacements: { id: newAddressId }, type: QueryTypes.SELECT },
    );

    return address;
  }

  async getUserAddresses(userId) {
    const [user] = await sequelize.query(
      "SELECT address_ids FROM users WHERE id = :userId LIMIT 1",
      { replacements: { userId }, type: QueryTypes.SELECT },
    );

    if (!user?.address_ids) return [];

    let addressIds = [];
    try {
      addressIds =
        typeof user.address_ids === "string"
          ? JSON.parse(user.address_ids)
          : user.address_ids;
    } catch {
      return [];
    }

    if (!Array.isArray(addressIds) || addressIds.length === 0) return [];

    const placeholders = addressIds.map((_, i) => `:id${i}`).join(", ");
    const replacements = {};
    addressIds.forEach((id, i) => {
      replacements[`id${i}`] = id;
    });

    return await sequelize.query(
      `SELECT * FROM addresses WHERE id IN (${placeholders}) ORDER BY created_at DESC`,
      { replacements, type: QueryTypes.SELECT },
    );
  }

  async getAddressesByType(userId, type) {
    const [user] = await sequelize.query(
      "SELECT address_ids FROM users WHERE id = :userId LIMIT 1",
      { replacements: { userId }, type: QueryTypes.SELECT },
    );

    if (!user?.address_ids) return [];

    let addressIds = [];
    try {
      addressIds =
        typeof user.address_ids === "string"
          ? JSON.parse(user.address_ids)
          : user.address_ids;
    } catch {
      return [];
    }

    if (!Array.isArray(addressIds) || addressIds.length === 0) return [];

    const placeholders = addressIds.map((_, i) => `:id${i}`).join(", ");
    const replacements = {};
    addressIds.forEach((id, i) => {
      replacements[`id${i}`] = id;
    });
    replacements.type = type;

    return await sequelize.query(
      `SELECT * FROM addresses WHERE id IN (${placeholders}) AND addresstype = :type`,
      { replacements, type: QueryTypes.SELECT },
    );
  }

  async getAddressById(addressId) {
    const [address] = await sequelize.query(
      "SELECT * FROM addresses WHERE id = :id LIMIT 1",
      { replacements: { id: addressId }, type: QueryTypes.SELECT },
    );
    return address || null;
  }

  async updateAddress(addressId, addressData) {
    const [address] = await sequelize.query(
      "SELECT id FROM addresses WHERE id = :id LIMIT 1",
      { replacements: { id: addressId }, type: QueryTypes.SELECT },
    );
    if (!address) throw new Error("Address not found");

    const setClauses = ["updated_at = NOW()"];
    const replacements = { id: addressId };

    const fields = [
      "name",
      "phone",
      "address_line1",
      "address_line2",
      "city",
      "state",
      "pincode",
      "country",
      "addresstype",
      "is_default",
    ];
    fields.forEach((field) => {
      if (addressData[field] !== undefined) {
        setClauses.push(`${field} = :${field}`);
        replacements[field] = addressData[field];
      }
    });

    await sequelize.query(
      `UPDATE addresses SET ${setClauses.join(", ")} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE },
    );

    const [updated] = await sequelize.query(
      "SELECT * FROM addresses WHERE id = :id LIMIT 1",
      { replacements: { id: addressId }, type: QueryTypes.SELECT },
    );
    return updated;
  }

  async deleteAddress(userId, addressId) {
    const [address] = await sequelize.query(
      "SELECT id FROM addresses WHERE id = :id LIMIT 1",
      { replacements: { id: addressId }, type: QueryTypes.SELECT },
    );
    if (!address) throw new Error("Address not found");

    await sequelize.query("DELETE FROM addresses WHERE id = :id", {
      replacements: { id: addressId },
      type: QueryTypes.DELETE,
    });

    const [user] = await sequelize.query(
      "SELECT address_ids FROM users WHERE id = :userId LIMIT 1",
      { replacements: { userId }, type: QueryTypes.SELECT },
    );

    if (user?.address_ids) {
      let addressIds = [];
      try {
        addressIds =
          typeof user.address_ids === "string"
            ? JSON.parse(user.address_ids)
            : user.address_ids;
      } catch {
        addressIds = [];
      }

      const updated = addressIds.filter((id) => id !== parseInt(addressId));
      await sequelize.query(
        "UPDATE users SET address_ids = :address_ids, updated_at = NOW() WHERE id = :userId",
        {
          replacements: { address_ids: JSON.stringify(updated), userId },
          type: QueryTypes.UPDATE,
        },
      );
    }

    return true;
  }

  async setDefaultAddress(userId, addressId) {
    const [user] = await sequelize.query(
      "SELECT address_ids FROM users WHERE id = :userId LIMIT 1",
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    if (!user?.address_ids) throw new Error("User or addresses not found");

    let addressIds = [];
    try {
      addressIds =
        typeof user.address_ids === "string"
          ? JSON.parse(user.address_ids)
          : user.address_ids;
    } catch {
      throw new Error("User or addresses not found");
    }

    if (!addressIds.includes(parseInt(addressId))) {
      throw new Error("Address does not belong to this user");
    }

    // Set all user addresses to not default
    if (addressIds.length > 0) {
      const placeholders = addressIds.map((_, i) => `:id${i}`).join(", ");
      const replacements = {};
      addressIds.forEach((id, i) => {
        replacements[`id${i}`] = id;
      });

      await sequelize.query(
        `UPDATE addresses SET is_default = 0, updated_at = NOW() WHERE id IN (${placeholders})`,
        { replacements, type: QueryTypes.UPDATE },
      );
    }

    // Set chosen one to default
    await sequelize.query(
      "UPDATE addresses SET is_default = 1, updated_at = NOW() WHERE id = :id",
      { replacements: { id: addressId }, type: QueryTypes.UPDATE },
    );

    const [address] = await sequelize.query(
      "SELECT * FROM addresses WHERE id = :id LIMIT 1",
      { replacements: { id: addressId }, type: QueryTypes.SELECT },
    );
    return address;
  }
}

export default new AddressService();
