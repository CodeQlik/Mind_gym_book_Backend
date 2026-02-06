import Address from '../models/Address.js';
import User from '../models/User.js';

export const addAddress = async (req, res) => {
    try {
        const { street, city, state, pin_code, country, userId } = req.body;

        const address = await Address.create({
            street,
            city,
            state,
            pin_code,
            country
        });

        if (userId) {
            const user = await User.findByPk(userId);
            if (user) {
                user.address_id = address.id;
                await user.save();
            }
        }

        res.status(201).json({
            success: true,
            message: "Address added successfully",
            data: address
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding address",
            error: error.message
        });
    }
};

// @desc    Get all addresses
// @route   GET /api/addresses
export const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.findAll();
        res.status(200).json({
            success: true,
            data: addresses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching addresses",
            error: error.message
        });
    }
};
