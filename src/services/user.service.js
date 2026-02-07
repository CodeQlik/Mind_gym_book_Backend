import { User, Address } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { uploadOnCloudinary } from '../config/cloudinary.js';
import generateToken from '../utils/generateToken.js';
import { Op } from 'sequelize';
import crypto from 'crypto';
import sendEmail from '../config/sendEmail.js';


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
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        if (!user) return null;

        const userJson = user.toJSON();

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

    async updateProfile(userId, data, files) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const { name, email, phone, additional_phone } = data;

        if (email && email !== user.email) {
            const existingEmail = await User.findOne({
                where: {
                    id: { [Op.ne]: userId },
                    email: email
                }
            });
            if (existingEmail) {
                throw new Error("Email is already in use by another account.");
            }
        }

        if (phone && phone !== user.phone) {
            const existingPhone = await User.findOne({
                where: {
                    id: { [Op.ne]: userId },
                    [Op.or]: [{ phone: phone }, { additional_phone: phone }]
                }
            });
            if (existingPhone) {
                throw new Error("Phone number is already in use.");
            }
        }

        if (additional_phone && additional_phone !== user.additional_phone) {
            const existingAddPhone = await User.findOne({
                where: {
                    id: { [Op.ne]: userId },
                    [Op.or]: [{ phone: additional_phone }, { additional_phone: additional_phone }]
                }
            });
            if (existingAddPhone) {
                throw new Error("Additional phone number is already in use.");
            }
        }

        let profileData = { ...user.profile } || { url: "", public_id: "", initials: "" };

        if (files?.profile_image?.[0]) {
            const result = await uploadOnCloudinary(files.profile_image[0].path);
            if (result) {
                profileData.url = result.secure_url;
                profileData.public_id = result.public_id;
            }
        }

        if (name) {
            profileData.initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        const updatedUser = await user.update({
            name: name || user.name,
            email: email || user.email,
            phone: phone || user.phone,
            additional_phone: additional_phone || user.additional_phone,
            profile: profileData
        });

        const userResponse = updatedUser.toJSON();
        delete userResponse.password;
        return userResponse;
    }

    async changePassword(userId, data) {
        const { old_password, new_password, confirm_password } = data;

        if (new_password !== confirm_password) {
            throw new Error("New password and confirm password do not match");
        }

        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const isMatch = await bcrypt.compare(old_password, user.password);
        if (!isMatch) {
            throw new Error("Invalid old password");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(new_password, salt);

        await user.update({ password: hashedNewPassword });
        return true;
    }

    async forgotPassword(email) {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            throw new Error("No account found with this email");
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        await user.update({
            reset_password_token: resetToken,
            reset_password_expiry: resetExpiry
        });

        // Send Email
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        const message = `
            <h1>Reset Your Password</h1>
            <p>You requested a password reset. Please click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `;

        await sendEmail(user.email, "Password Reset Request", message);
        return true;
    }

    async resetPassword(token, newPassword) {
        const user = await User.findOne({
            where: {
                reset_password_token: token,
                reset_password_expiry: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!user) {
            throw new Error("Invalid or expired reset token");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await user.update({
            password: hashedPassword,
            reset_password_token: null,
            reset_password_expiry: null
        });

        return true;
    }
}




export default new UserService();
