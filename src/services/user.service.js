import { User, Address, EmailVerification } from "../models/index.js";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import sendEmail from "../config/sendEmail.js";

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
      initials: name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
        : "",
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
      user_type: "admin",
      profile: profileData,
      is_active: is_active === "false" ? false : true,
    });

    return this.formatUserResponse(admin);
  }

  async findUserByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async sendRegistrationOTP(email) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("Email is already registered. Please login.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert OTP into email_verifications table using Sequelize
    await EmailVerification.upsert({
      email,
      otp,
    });

    const message = `<h2>Registration Verification Code</h2><p>Your OTP is:</p><h1>${otp}</h1><p>This code is valid for 10 minutes.</p>`;
    await sendEmail(email, "Verify Your Email", message);

    return true;
  }

  async validateRegistrationOTP(email, otp) {
    if (!otp) {
      throw new Error("OTP is required.");
    }

    const record = await EmailVerification.findOne({
      where: { email, otp },
    });

    if (!record) {
      throw new Error("Invalid OTP");
    }

    const expiryTime = new Date(record.updatedAt).getTime() + 10 * 60 * 1000;
    if (Date.now() > expiryTime) {
      throw new Error("OTP has expired.");
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { email, type: "email_verified" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "10m" },
    );

    return verificationToken;
  }

  async registerUser(data, files, verificationToken) {
    const { email, password, name, phone, additional_phone, user_type } = data;

    // 1. Verify verification token
    if (!verificationToken) {
      throw new Error(
        "Email verification required. Please verify your email first.",
      );
    }

    let verifiedEmail;
    try {
      const decoded = jwt.verify(
        verificationToken,
        process.env.JWT_SECRET || "secret",
      );
      if (decoded.type !== "email_verified") {
        throw new Error("Invalid verification token.");
      }
      verifiedEmail = decoded.email;
    } catch (error) {
      throw new Error(
        "Invalid or expired verification token. Please verify your email again.",
      );
    }

    // 2. Ensure the email in the token matches the email in the request
    if (verifiedEmail !== email) {
      throw new Error("Email mismatch. Please use the verified email address.");
    }

    // 3. Check if email exists (double check)
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new Error("Email is already registered.");
    }

    if (phone) {
      const existingPhone = await User.findOne({
        where: { [Op.or]: [{ phone: phone }, { additional_phone: phone }] },
      });
      if (existingPhone) {
        throw new Error("Phone number is already in use by another account.");
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let profileData = {
      url: "",
      public_id: "",
      initials: name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
        : "",
    };

    if (files && files.profile_image && files.profile_image[0]) {
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
      user_type: user_type || "user",
      profile: profileData,
      is_active: true, // User is verified
    });

    // 4. Clear OTP after success
    await EmailVerification.destroy({
      where: { email },
    });

    return { user: this.formatUserResponse(user) };
  }

  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid email or password");

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await user.update({ refresh_token: refreshToken });

    return {
      ...this.formatUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async googleLogin(idToken) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random password
        user_type: "user",
        profile: {
          url: picture,
          public_id: "",
          initials: name
            ? name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            : "",
        },
        is_active: true,
        is_verified: true,
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await user.update({ refresh_token: refreshToken });

    return {
      ...this.formatUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw new Error("Unauthorized request. Refresh token is missing.");
    }

    try {
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
      );

      const user = await User.findByPk(decodedToken.id);

      if (!user) {
        throw new Error("Invalid refresh token.");
      }

      if (incomingRefreshToken !== user.refresh_token) {
        throw new Error("Refresh token is expired or used.");
      }

      const accessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      await user.update({ refresh_token: newRefreshToken });

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error(error?.message || "Invalid refresh token");
    }
  }

  async getUserProfile(userId) {
    const user = await User.findByPk(userId);
    if (!user) return null;

    const userJson = this.formatUserResponse(user);

    if (
      Array.isArray(userJson.address_ids) &&
      userJson.address_ids.length > 0
    ) {
      userJson.all_addresses = await Address.findAll({
        where: { id: userJson.address_ids },
      });
    } else {
      userJson.all_addresses = [];
    }

    return userJson;
  }

  async updateProfile(userId, data, files) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    const {
      name,
      email,
      phone,
      additional_phone,
      user_type,
      is_active,
      is_verified,
      subscription_status,
      subscription_plan,
      subscription_end_date,
    } = data;

    // 1. Check if email is already in use by another user
    if (email && email !== user.email) {
      const existing = await User.findOne({
        where: { id: { [Op.ne]: userId }, email },
      });
      if (existing) throw new Error("Email is already in use.");
    }

    // 2. Handle Profile Data and Image
    let currentProfile = user.profile;
    if (typeof currentProfile === "string") {
      try {
        currentProfile = JSON.parse(currentProfile);
      } catch (e) {
        currentProfile = {};
      }
    }

    let profileData = {
      url: currentProfile?.url || "",
      public_id: currentProfile?.public_id || "",
      initials: currentProfile?.initials || "",
    };

    // If a new profile image is uploaded
    if (files?.profile_image?.[0]) {
      // Delete the old image from Cloudinary if it exists
      if (profileData.public_id) {
        await deleteFromCloudinary(profileData.public_id);
      }

      // Upload the new image
      const result = await uploadOnCloudinary(files.profile_image[0].path);
      if (result) {
        profileData.url = result.secure_url;
        profileData.public_id = result.public_id;
      }
    }

    // Update initials if name changes
    if (name) {
      profileData.initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }

    // 3. Perform Update
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (additional_phone !== undefined)
      updateData.additional_phone = additional_phone;
    if (user_type !== undefined) updateData.user_type = user_type;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_verified !== undefined) updateData.is_verified = is_verified;
    if (subscription_status !== undefined)
      updateData.subscription_status = subscription_status;
    if (subscription_plan !== undefined)
      updateData.subscription_plan = subscription_plan;
    if (subscription_end_date !== undefined)
      updateData.subscription_end_date = subscription_end_date;

    updateData.profile = profileData;

    await user.update(updateData);

    return this.formatUserResponse(user);
  }

  async changePassword(userId, data) {
    const { old_password, new_password, confirm_password } = data;
    if (new_password !== confirm_password)
      throw new Error("Passwords do not match");

    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) throw new Error("Invalid old password");

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(new_password, salt);
    await user.save();
    return true;
  }

  async forgotPassword(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error("No account found with this email");

    const resetToken = jwt.sign(
      { email: user.email, type: "reset" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1h" },
    );
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    const message = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px;">
          <h1 style="color: #333; margin: 0;">Mind Gym Book</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #444; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hello, <br><br>
            We received a request to reset your password for your Mind Gym Book account. Click the button below to set a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #888; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding-top: 20px; color: #999; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Mind Gym Book. All rights reserved.
        </div>
      </div>
    `;

    await sendEmail(user.email, "Password Reset Request", message);
    return true;
  }

  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

      if (!decoded || decoded.type !== "reset") {
        throw new Error("Invalid token type");
      }

      const user = await User.findOne({ where: { email: decoded.email } });
      if (!user) {
        throw new Error("User associated with this token not found");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await user.update({ password: hashedPassword });

      return true;
    } catch (error) {
      console.error("Reset Password Error:", error.message);
      if (error.name === "TokenExpiredError") {
        throw new Error("Reset token has expired. Please request a new one.");
      }
      if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid reset token.");
      }
      throw error;
    }
  }

  async deleteAccount(userId, password) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid password");

    await user.destroy();
    return true;
  }

  async getAllUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users: rows.map((u) => this.formatUserResponse(u)),
    };
  }

  formatUserResponse(user) {
    if (!user) return null;
    const userJson = user.toJSON ? user.toJSON() : user;

    if (typeof userJson.profile === "string") {
      try {
        userJson.profile = JSON.parse(userJson.profile);
      } catch (e) {
        userJson.profile = {};
      }
    }
    if (typeof userJson.address_ids === "string") {
      try {
        userJson.address_ids = JSON.parse(userJson.address_ids);
      } catch (e) {
        userJson.address_ids = [];
      }
    }

    delete userJson.password;
    delete userJson.refresh_token;
    return userJson;
  }

  async getUserById(userId) {
    return await this.getUserProfile(userId);
  }

  async deleteUser(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found");
    await user.destroy();
    return true;
  }

  async searchUsers(query, page = 1, limit = 10) {
    const { Op } = (await import("sequelize")).default;
    const offset = (page - 1) * limit;
    const where = {
      [Op.or]: [
        { name: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { phone: { [Op.like]: `%${query}%` } },
      ],
    };

    const { count, rows } = await User.findAndCountAll({
      where,
      offset,
      limit,
      order: [["createdAt", "DESC"]],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users: rows.map((u) => this.formatUserResponse(u)),
    };
  }
}

export default new UserService();
