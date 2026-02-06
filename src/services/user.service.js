import { User, Address } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { uploadOnCloudinary } from '../config/cloudinary.js';
import generateToken from '../utils/generateToken.js';
import { Op } from 'sequelize';

class UserService {
    async registerAdmin(data, files) {
        const { email, password, name, is_active, phone } = data;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let profileData = {
            url: "",
            public_id: "",
            initials: name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : ""
        };

        if (files?.profile_image?.[0]) {
            const result = await uploadOnCloudinary(files.profile_image[0].path);
            if (result) {
                profileData.url = result.secure_url;
                profileData.public_id = result.public_id;
            }
        }

        const admin = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            user_type: 'admin',
            profile: profileData,
            is_active: is_active === 'false' ? false : true
        });

        const userResponse = admin.toJSON();
        delete userResponse.password;
        return userResponse;
    }


    async findUserByEmail(email) {
        return await User.findOne({ where: { email } });
    }

    async registerUser(data, files) {
        const { email, password, name, phone, additional_phone } = data;

        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            throw new Error("Email is already registered. Please use a different email.");
        }

        if (phone) {
            const existingPhone = await User.findOne({
                where: {
                    [Op.or]: [
                        { phone: phone },
                        { additional_phone: phone }
                    ]
                }
            });
            if (existingPhone) {
                throw new Error("Phone number is already in use by another account.");
            }
        }

        if (additional_phone) {
            const existingAddPhone = await User.findOne({
                where: {
                    [Op.or]: [
                        { phone: additional_phone },
                        { additional_phone: additional_phone }
                    ]
                }
            });
            if (existingAddPhone) {
                throw new Error("Additional phone number is already in use by another account.");
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let profileData = {
            url: "",
            public_id: "",
            initials: name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : ""
        };

        if (files?.profile_image?.[0]) {
            const result = await uploadOnCloudinary(files.profile_image[0].path);
            if (result) {
                profileData.url = result.secure_url;
                profileData.public_id = result.public_id;
            }
        }

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            additional_phone,
            user_type: 'user',
            profile: profileData,
            is_active: true
        });


        const userResponse = user.toJSON();
        delete userResponse.password;
        return userResponse;
    }

    async login(email, password) {
        const user = await User.findOne({ where: { email } });

        if (!user) {
            throw new Error("Invalid email or password");
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            throw new Error("Invalid email or password");
        }

        const userResponse = user.toJSON();
        delete userResponse.password;

        return {
            ...userResponse,
            token: generateToken(user.id)
        };
    }

    async getUserProfile(userId) {
        // Fetch user without password
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) return null;

        const userJson = user.toJSON();

        // If there are address IDs, fetch all corresponding addresses
        if (Array.isArray(userJson.address_ids) && userJson.address_ids.length > 0) {
            const addresses = await Address.findAll({
                where: {
                    id: userJson.address_ids
                }
            });
            userJson.all_addresses = addresses;
        } else {
            userJson.all_addresses = [];
        }


        return userJson;
    }

}


export default new UserService();
