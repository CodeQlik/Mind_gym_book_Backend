import sequelize from "../config/db.js";
import { QueryTypes } from "sequelize";
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
import jwt from "jsonwebtoken";
import sendEmail from "../config/sendEmail.js";
import notificationService from "./notification.service.js";

class UserService {
  // ─── Helper: Format user response ───────────────────────────────────────────
  formatUserResponse(user) {
    if (!user) return null;

    if (typeof user.profile === "string") {
      try {
        user.profile = JSON.parse(user.profile);
      } catch (e) {
        user.profile = {};
      }
    }
    if (typeof user.address_ids === "string") {
      try {
        user.address_ids = JSON.parse(user.address_ids);
      } catch (e) {
        user.address_ids = [];
      }
    }

    delete user.password;
    delete user.refresh_token;
    return user;
  }

  // ─── Helper: Build initials from name ───────────────────────────────────────
  buildInitials(name) {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "";
  }

  // ─── Register Admin ──────────────────────────────────────────────────────────
  async registerAdmin(data, files) {
    const { email, password, name, is_active, phone } = data;

    // Check existing user
    const [existing] = await sequelize.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existing) throw new Error("User with this email already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const profileData = JSON.stringify({
      url: "",
      public_id: "",
      initials: this.buildInitials(name),
    });

    let profileObj = JSON.parse(profileData);
    if (files?.profile_image?.[0]) {
      const result = await uploadOnCloudinary(files.profile_image[0].path);
      if (result) {
        profileObj.url = result.secure_url;
        profileObj.public_id = result.public_id;
      }
    }

    const isActiveVal = is_active === "false" ? 0 : 1;

    const [, meta] = await sequelize.query(
      `INSERT INTO users (name, email, phone, password, user_type, profile, is_active, created_at, updated_at)
       VALUES (:name, :email, :phone, :password, 'admin', :profile, :is_active, NOW(), NOW())`,
      {
        replacements: {
          name,
          email,
          phone,
          password: hashedPassword,
          profile: JSON.stringify(profileObj),
          is_active: isActiveVal,
        },
        type: QueryTypes.INSERT,
      },
    );

    const [admin] = await sequelize.query(
      "SELECT * FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: meta }, type: QueryTypes.SELECT },
    );

    return this.formatUserResponse(admin);
  }

  // ─── Find User By Email ──────────────────────────────────────────────────────
  async findUserByEmail(email) {
    const [user] = await sequelize.query(
      "SELECT * FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    return user || null;
  }

  // ─── Send Registration OTP ───────────────────────────────────────────────────
  async sendRegistrationOTP(email) {
    const [existing] = await sequelize.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existing) throw new Error("Email is already registered. Please login.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert OTP
    await sequelize.query(
      `INSERT INTO email_verifications (email, otp, created_at, updated_at)
       VALUES (:email, :otp, NOW(), NOW())
       ON DUPLICATE KEY UPDATE otp = :otp, updated_at = NOW()`,
      { replacements: { email, otp }, type: QueryTypes.INSERT },
    );

    const message = `<h2>Registration Verification Code</h2><p>Your OTP is:</p><h1>${otp}</h1><p>This code is valid for 10 minutes.</p>`;
    await sendEmail(email, "Verify Your Email", message);
    return true;
  }

  // ─── Validate Registration OTP ───────────────────────────────────────────────
  async validateRegistrationOTP(email, otp) {
    if (!otp) throw new Error("OTP is required.");

    const [record] = await sequelize.query(
      "SELECT * FROM email_verifications WHERE email = :email AND otp = :otp LIMIT 1",
      { replacements: { email, otp }, type: QueryTypes.SELECT },
    );
    if (!record) throw new Error("Invalid OTP");

    const expiryTime = new Date(record.updated_at).getTime() + 10 * 60 * 1000;
    if (Date.now() > expiryTime) throw new Error("OTP has expired.");

    const verificationToken = jwt.sign(
      { email, type: "email_verified" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "10m" },
    );
    return verificationToken;
  }

  // ─── Register User ───────────────────────────────────────────────────────────
  async registerUser(data, files, verificationToken) {
    const { email, password, name, phone, additional_phone, user_type } = data;

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
      if (decoded.type !== "email_verified")
        throw new Error("Invalid verification token.");
      verifiedEmail = decoded.email;
    } catch {
      throw new Error(
        "Invalid or expired verification token. Please verify your email again.",
      );
    }

    if (verifiedEmail !== email) {
      throw new Error("Email mismatch. Please use the verified email address.");
    }

    // Check email duplicate
    const [existingEmail] = await sequelize.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existingEmail) throw new Error("Email is already registered.");

    // Check phone duplicate
    if (phone) {
      const [existingPhone] = await sequelize.query(
        "SELECT id FROM users WHERE phone = :phone OR additional_phone = :phone LIMIT 1",
        { replacements: { phone }, type: QueryTypes.SELECT },
      );
      if (existingPhone)
        throw new Error("Phone number is already in use by another account.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let profileObj = {
      url: "",
      public_id: "",
      initials: this.buildInitials(name),
    };

    if (files?.profile_image?.[0]) {
      const result = await uploadOnCloudinary(files.profile_image[0].path);
      if (result) {
        profileObj.url = result.secure_url;
        profileObj.public_id = result.public_id;
      }
    }

    const [, meta] = await sequelize.query(
      `INSERT INTO users (name, email, password, phone, additional_phone, user_type, profile, is_active, created_at, updated_at)
       VALUES (:name, :email, :password, :phone, :additional_phone, :user_type, :profile, 1, NOW(), NOW())`,
      {
        replacements: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          additional_phone: additional_phone || null,
          user_type: user_type || "user",
          profile: JSON.stringify(profileObj),
        },
        type: QueryTypes.INSERT,
      },
    );

    const userId = meta;

    // Clear OTP
    await sequelize.query(
      "DELETE FROM email_verifications WHERE email = :email",
      { replacements: { email }, type: QueryTypes.DELETE },
    );

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    await sequelize.query(
      "UPDATE users SET refresh_token = :refreshToken WHERE id = :id",
      { replacements: { refreshToken, id: userId }, type: QueryTypes.UPDATE },
    );

    // 🏆 Send Welcome Notification
    try {
      await notificationService.sendToUser(
        userId,
        "WELCOME",
        "Welcome to Mind Gym Book! 📚",
        "Hello {user_name}, we are thrilled to have you here! Start exploring our massive collection of books and start your reading journey today.",
      );
    } catch (notifErr) {
      console.error("[WELCOME NOTIFICATION ERROR]:", notifErr.message);
    }

    return {
      user_id: userId,
      user_type: data.user_type || "user",
      accessToken,
      refreshToken,
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(email, password) {
    const [user] = await sequelize.query(
      "SELECT * FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (!user) throw new Error("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid email or password");

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await sequelize.query(
      "UPDATE users SET refresh_token = :refreshToken WHERE id = :id",
      { replacements: { refreshToken, id: user.id }, type: QueryTypes.UPDATE },
    );

    return {
      user_id: user.id,
      user_type: user.user_type,
      accessToken,
      refreshToken,
    };
  }

  // ─── Google Login ────────────────────────────────────────────────────────────
  async googleLogin(idToken) {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let [user] = await sequelize.query(
      "SELECT * FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-8),
        10,
      );
      const profileObj = {
        url: picture,
        public_id: "",
        initials: this.buildInitials(name),
      };

      const [, meta] = await sequelize.query(
        `INSERT INTO users (name, email, password, user_type, profile, is_active, is_verified, created_at, updated_at)
         VALUES (:name, :email, :password, 'user', :profile, 1, 1, NOW(), NOW())`,
        {
          replacements: {
            name,
            email,
            password: randomPassword,
            profile: JSON.stringify(profileObj),
          },
          type: QueryTypes.INSERT,
        },
      );

      const [newUser] = await sequelize.query(
        "SELECT * FROM users WHERE id = :id LIMIT 1",
        { replacements: { id: meta }, type: QueryTypes.SELECT },
      );
      user = newUser;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await sequelize.query(
      "UPDATE users SET refresh_token = :refreshToken WHERE id = :id",
      { replacements: { refreshToken, id: user.id }, type: QueryTypes.UPDATE },
    );

    // 🏆 Send Welcome Notification for NEW Google Users
    if (isNewUser) {
      try {
        await notificationService.sendToUser(
          user.id,
          "WELCOME",
          "Welcome to Mind Gym Book! 📚",
          "Hello {user_name}, we are thrilled to have you here! Start exploring our massive collection of books and start your reading journey today.",
        );
      } catch (notifErr) {
        console.error("[WELCOME NOTIFICATION ERROR]:", notifErr.message);
      }
    }

    return {
      user_id: user.id,
      user_type: user.user_type,
      accessToken,
      refreshToken,
    };
  }

  // ─── Refresh Access Token ────────────────────────────────────────────────────
  async refreshAccessToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw new Error("Unauthorized request. Refresh token is missing.");
    }

    try {
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
      );

      const [user] = await sequelize.query(
        "SELECT id, refresh_token FROM users WHERE id = :id LIMIT 1",
        { replacements: { id: decodedToken.id }, type: QueryTypes.SELECT },
      );

      if (!user) throw new Error("Invalid refresh token.");
      if (incomingRefreshToken !== user.refresh_token) {
        throw new Error("Refresh token is expired or used.");
      }

      const accessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      await sequelize.query(
        "UPDATE users SET refresh_token = :refreshToken WHERE id = :id",
        {
          replacements: { refreshToken: newRefreshToken, id: user.id },
          type: QueryTypes.UPDATE,
        },
      );

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error(error?.message || "Invalid refresh token");
    }
  }

  // ─── Get User Profile ────────────────────────────────────────────────────────
  async getUserProfile(userId) {
    const [user] = await sequelize.query(
      "SELECT * FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );
    if (!user) return null;

    const formatted = this.formatUserResponse(user);

    if (
      Array.isArray(formatted.address_ids) &&
      formatted.address_ids.length > 0
    ) {
      const placeholders = formatted.address_ids
        .map((_, i) => `:id${i}`)
        .join(", ");
      const replacements = {};
      formatted.address_ids.forEach((id, i) => {
        replacements[`id${i}`] = id;
      });

      formatted.all_addresses = await sequelize.query(
        `SELECT * FROM addresses WHERE id IN (${placeholders})`,
        { replacements, type: QueryTypes.SELECT },
      );
    } else {
      formatted.all_addresses = [];
    }

    return formatted;
  }

  // ─── Update Profile ──────────────────────────────────────────────────────────
  async updateProfile(userId, data, files) {
    const [user] = await sequelize.query(
      "SELECT * FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );
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

    // Check email conflict
    if (email && email !== user.email) {
      const [conflict] = await sequelize.query(
        "SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1",
        { replacements: { email, id: userId }, type: QueryTypes.SELECT },
      );
      if (conflict) throw new Error("Email is already in use.");
    }

    // Handle profile image
    let currentProfile = user.profile;
    if (typeof currentProfile === "string") {
      try {
        currentProfile = JSON.parse(currentProfile);
      } catch {
        currentProfile = {};
      }
    }

    let profileObj = {
      url: currentProfile?.url || "",
      public_id: currentProfile?.public_id || "",
      initials: currentProfile?.initials || "",
    };

    if (files?.profile_image?.[0]) {
      if (profileObj.public_id)
        await deleteFromCloudinary(profileObj.public_id);
      const result = await uploadOnCloudinary(files.profile_image[0].path);
      if (result) {
        profileObj.url = result.secure_url;
        profileObj.public_id = result.public_id;
      }
    }

    if (name) profileObj.initials = this.buildInitials(name);

    // Build dynamic SET clause
    const setClauses = ["profile = :profile", "updated_at = NOW()"];
    const replacements = { profile: JSON.stringify(profileObj), id: userId };

    if (name !== undefined) {
      setClauses.push("name = :name");
      replacements.name = name;
    }
    if (email !== undefined) {
      setClauses.push("email = :email");
      replacements.email = email;
    }
    if (phone !== undefined) {
      setClauses.push("phone = :phone");
      replacements.phone = phone;
    }
    if (additional_phone !== undefined) {
      setClauses.push("additional_phone = :additional_phone");
      replacements.additional_phone = additional_phone;
    }
    if (user_type !== undefined) {
      setClauses.push("user_type = :user_type");
      replacements.user_type = user_type;
    }
    if (is_active !== undefined) {
      setClauses.push("is_active = :is_active");
      replacements.is_active = is_active;
    }
    if (is_verified !== undefined) {
      setClauses.push("is_verified = :is_verified");
      replacements.is_verified = is_verified;
    }
    if (subscription_status !== undefined) {
      setClauses.push("subscription_status = :subscription_status");
      replacements.subscription_status = subscription_status;
    }
    if (subscription_plan !== undefined) {
      setClauses.push("subscription_plan = :subscription_plan");
      replacements.subscription_plan = subscription_plan;
    }
    if (subscription_end_date !== undefined) {
      setClauses.push("subscription_end_date = :subscription_end_date");
      replacements.subscription_end_date = subscription_end_date;
    }

    await sequelize.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE },
    );

    const [updated] = await sequelize.query(
      "SELECT * FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );
    return this.formatUserResponse(updated);
  }

  // ─── Change Password ─────────────────────────────────────────────────────────
  async changePassword(userId, data) {
    const { old_password, new_password, confirm_password } = data;
    if (new_password !== confirm_password)
      throw new Error("Passwords do not match");

    const [user] = await sequelize.query(
      "SELECT id, password FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) throw new Error("Invalid old password");

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await sequelize.query(
      "UPDATE users SET password = :password, updated_at = NOW() WHERE id = :id",
      {
        replacements: { password: hashedPassword, id: userId },
        type: QueryTypes.UPDATE,
      },
    );
    return true;
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(email) {
    const [user] = await sequelize.query(
      "SELECT id, email FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
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
            We received a request to reset your password. Click the button below to set a new password:
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

  // ─── Reset Password ──────────────────────────────────────────────────────────
  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
      if (!decoded || decoded.type !== "reset")
        throw new Error("Invalid token type");

      const [user] = await sequelize.query(
        "SELECT id FROM users WHERE email = :email LIMIT 1",
        { replacements: { email: decoded.email }, type: QueryTypes.SELECT },
      );
      if (!user) throw new Error("User associated with this token not found");

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await sequelize.query(
        "UPDATE users SET password = :password, updated_at = NOW() WHERE id = :id",
        {
          replacements: { password: hashedPassword, id: user.id },
          type: QueryTypes.UPDATE,
        },
      );
      return true;
    } catch (error) {
      console.error("Reset Password Error:", error.message);
      if (error.name === "TokenExpiredError")
        throw new Error("Reset token has expired. Please request a new one.");
      if (error.name === "JsonWebTokenError")
        throw new Error("Invalid reset token.");
      throw error;
    }
  }

  // ─── Delete Account ──────────────────────────────────────────────────────────
  async deleteAccount(userId, password) {
    const [user] = await sequelize.query(
      "SELECT id, password FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid password");

    await sequelize.query("DELETE FROM users WHERE id = :id", {
      replacements: { id: userId },
      type: QueryTypes.DELETE,
    });
    return true;
  }

  // ─── Get All Users (Paginated) ───────────────────────────────────────────────
  async getAllUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [countResult] = await sequelize.query(
      "SELECT COUNT(*) AS total FROM users",
      { type: QueryTypes.SELECT },
    );
    const total = countResult.total;

    const users = await sequelize.query(
      "SELECT * FROM users ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
      { replacements: { limit, offset }, type: QueryTypes.SELECT },
    );

    return {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      users: users.map((u) => this.formatUserResponse(u)),
    };
  }

  // ─── Get User By ID ──────────────────────────────────────────────────────────
  async getUserById(userId) {
    return await this.getUserProfile(userId);
  }

  // ─── Delete User (Admin) ─────────────────────────────────────────────────────
  async deleteUser(userId) {
    const [user] = await sequelize.query(
      "SELECT id FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );
    if (!user) throw new Error("User not found");

    await sequelize.query("DELETE FROM users WHERE id = :id", {
      replacements: { id: userId },
      type: QueryTypes.DELETE,
    });
    return true;
  }

  async updateTTSPreferences(userId, prefs) {
    await sequelize.query(
      "UPDATE users SET tts_preferences = :prefs WHERE id = :userId",
      {
        replacements: { prefs: JSON.stringify(prefs), userId },
        type: QueryTypes.UPDATE,
      },
    );

    const [updated] = await sequelize.query(
      "SELECT tts_preferences FROM users WHERE id = :userId LIMIT 1",
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    return updated;
  }

  // ─── Search Users (Admin) ────────────────────────────────────────────────────
  async searchUsers(query, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const searchTerm = `%${query}%`;

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM users
       WHERE name LIKE :search OR email LIKE :search OR phone LIKE :search`,
      { replacements: { search: searchTerm }, type: QueryTypes.SELECT },
    );
    const total = countResult.total;

    const users = await sequelize.query(
      `SELECT * FROM users
       WHERE name LIKE :search OR email LIKE :search OR phone LIKE :search
       ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
      {
        replacements: { search: searchTerm, limit, offset },
        type: QueryTypes.SELECT,
      },
    );

    return {
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      users: users.map((u) => this.formatUserResponse(u)),
    };
  }
}

export default new UserService();
