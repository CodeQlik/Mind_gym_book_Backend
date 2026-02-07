import { User, Address } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { uploadOnCloudinary } from '../config/cloudinary.js';
import generateToken from '../utils/generateToken.js';
import { Op } from 'sequelize';
import crypto from 'crypto';
import sendEmail from '../config/sendEmail.js';
import jwt from 'jsonwebtoken';


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

        // Send Verification Email and get OTP token
        const otpToken = await this.sendVerificationEmail(user);

        const userResponse = user.toJSON();
        delete userResponse.password;
        return { user: userResponse, otpToken };
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

        // Generate reset token using JWT
        const resetToken = jwt.sign({ email: user.email, type: 'reset' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

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
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (error) {
            throw new Error("Invalid or expired reset token");
        }

        if (decoded.type !== 'reset') {
            throw new Error("Invalid token type");
        }

        const user = await User.findOne({ where: { email: decoded.email } });

        if (!user) {
            throw new Error("User not found");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await user.update({
            password: hashedPassword
        });

        return true;
    }

    async deleteAccount(userId, password) {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid password. Account deletion failed.");
        }

        // Delete associated addresses
        if (Array.isArray(user.address_ids) && user.address_ids.length > 0) {
            await Address.destroy({
                where: {
                    id: user.address_ids
                }
            });
        }

        // Delete the user
        await user.destroy();
        return true;
    }

    async sendOTPForVerification(email) {
        console.log(`[OTP Service] Generating OTP for: ${email}`);
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Sign OTP and email into a JWT (valid for 2 mins)
        const otpToken = jwt.sign({ email, otp, type: 'verify' }, process.env.JWT_SECRET || 'secret', { expiresIn: '2m' });

        const message = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #007bff;">Email Verification</h2>
                <p>Hello,</p>
                <p>Your OTP for email verification is:</p>
                <h1 style="background: #f4f4f4; padding: 10px; text-align: center; border-radius: 5px; letter-spacing: 5px;">${otp}</h1>
                <p>This OTP is valid for 2 minutes. Please do not share it with anyone.</p>
            </div>
        `;
        await sendEmail(email, "Your Verification OTP", message);
        console.log(`[OTP Service] OTP sent successfully to: ${email}`);
        return otpToken;
    }

    async sendVerificationEmail(user) {
        return await this.sendOTPForVerification(user.email);
    }

    async verifyEmail(email, otp, otpToken) {
        console.log(`[OTP Service] Verification attempt for: ${email} with OTP: ${otp}`);

        if (!otpToken) {
            console.error(`[OTP Service] Verification failed: No otpToken provided for ${email}`);
            throw new Error("Verification session expired. Please resend OTP.");
        }

        let decoded;
        try {
            decoded = jwt.verify(otpToken, process.env.JWT_SECRET || 'secret');
        } catch (error) {
            console.error(`[OTP Service] Verification failed: JWT verification error for ${email} - ${error.message}`);
            throw new Error("Invalid or expired verification session. Please resend OTP.");
        }

        if (decoded.type !== 'verify' || decoded.email !== email) {
            console.error(`[OTP Service] Verification failed: Token payload mismatch for ${email}. Expected ${email}, got ${decoded.email}`);
            throw new Error("Invalid verification session.");
        }

        if (decoded.otp !== otp) {
            console.error(`[OTP Service] Verification failed: Invalid OTP entered for ${email}. Expected ${decoded.otp}, got ${otp}`);
            throw new Error("Invalid OTP. Please try again.");
        }

        console.log(`[OTP Service] OTP validated successfully for: ${email}`);

        const user = await User.findOne({ where: { email } });

        if (user) {
            await user.update({
                is_verified: true
            });
            console.log(`[OTP Service] User marked as verified in DB: ${email}`);
        } else {
            console.log(`[OTP Service] Pre-registration verification successful for: ${email}`);
        }

        return true;
    }

    async sendOTP(email) {
        const user = await User.findOne({ where: { email } });
        if (user && user.is_verified) {
            throw new Error("Email is already verified");
        }

        return await this.sendOTPForVerification(email);
    }

    async getAllUsers() {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });

        const usersWithAddresses = await Promise.all(users.map(async (user) => {
            const userJson = user.toJSON();
            if (Array.isArray(userJson.address_ids) && userJson.address_ids.length > 0) {
                userJson.all_addresses = await Address.findAll({
                    where: { id: userJson.address_ids }
                });
            } else {
                userJson.all_addresses = [];
            }
            return userJson;
        }));

        return usersWithAddresses;
    }
}




export default new UserService();
