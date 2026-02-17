import { User, Address } from "../models/index.js";
import bcrypt from "bcryptjs";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import generateToken from "../utils/generateToken.js";
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

  async registerUser(data, files) {
    const { email, password, name, phone, additional_phone, user_type } = data;

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new Error(
        "Email is already registered. Please use a different email.",
      );
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
      is_active: true,
      is_verified: true,
    });

    return { user: this.formatUserResponse(user) };
  }

  async login(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid email or password");

    return {
      ...this.formatUserResponse(user),
      token: generateToken(user.id),
    };
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

    const { name, email, phone, additional_phone } = data;

    if (email && email !== user.email) {
      const existing = await User.findOne({
        where: { id: { [Op.ne]: userId }, email },
      });
      if (existing) throw new Error("Email is already in use.");
    }

    // Handle profile JSON parsing
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

    if (files?.profile_image?.[0]) {
      if (profileData.public_id) {
        // Option to delete old image here
      }
      const result = await uploadOnCloudinary(files.profile_image[0].path);
      if (result) {
        profileData.url = result.secure_url;
        profileData.public_id = result.public_id;
      }
    }

    if (name) {
      profileData.initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }

    await user.update({
      name: name || user.name,
      email: email || user.email,
      phone: phone || user.phone,
      additional_phone: additional_phone || user.additional_phone,
      profile: profileData,
    });

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
    const message = `<h1>Reset Your Password</h1><p>Click <a href="${resetUrl}">here</a> to reset.</p>`;

    await sendEmail(user.email, "Password Reset Request", message);
    return true;
  }

  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
      if (decoded.type !== "reset") throw new Error("Invalid token");

      const user = await User.findOne({ where: { email: decoded.email } });
      if (!user) throw new Error("User not found");

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();
      return true;
    } catch (e) {
      throw new Error("Invalid or expired reset token");
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

  async sendOTPForVerification(email) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpToken = jwt.sign(
      { email, otp, type: "verify" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "5m" },
    );
    const message = `<h2>Verification OTP</h2><h1>${otp}</h1>`;
    await sendEmail(email, "Your Verification OTP", message);
    return otpToken;
  }

  async sendVerificationEmail(user) {
    return await this.sendOTPForVerification(user.email);
  }

  async verifyEmail(email, otp, otpToken) {
    try {
      const decoded = jwt.verify(otpToken, process.env.JWT_SECRET || "secret");
      if (
        decoded.type !== "verify" ||
        decoded.email !== email ||
        decoded.otp !== otp
      ) {
        throw new Error("Invalid verification details.");
      }
      const user = await User.findOne({ where: { email } });
      if (user) await user.update({ is_verified: true });
      return true;
    } catch (e) {
      throw new Error(e.message || "Verification failed");
    }
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
