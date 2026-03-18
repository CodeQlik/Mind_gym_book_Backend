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
  //  Helper: Format user response
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

    // Ad-free logic (Paid active plans)
    user.is_ad_free =
      user.subscription_status === "active" &&
      user.subscription_plan !== "free";

    delete user.password;
    delete user.refresh_token;
    return user;
  }

  // ─── Helper: Build initials from name
  buildInitials(name) {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "";
  }

  // ─── Register Admin
  async registerAdmin(data, files) {
    const { email, password, name, is_active, phone } = data;

    // Check existing user
    const [existing] = await sequelize.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existing) throw new Error("An account with this email address already exists.");

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

  // ─── Find User By Email
  async findUserByEmail(email) {
    const [user] = await sequelize.query(
      "SELECT * FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    return user || null;
  }

  // ─── Send Registration OTP
  async sendRegistrationOTP(email) {
    const [existing] = await sequelize.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existing) throw new Error("This email address is already registered. Please log in to your account.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert OTP
    await sequelize.query(
      `INSERT INTO email_verifications (email, otp, created_at, updated_at)
       VALUES (:email, :otp, NOW(), NOW())
       ON DUPLICATE KEY UPDATE otp = :otp, updated_at = NOW()`,
      { replacements: { email, otp }, type: QueryTypes.INSERT },
    );

    const message = `<h2>Registration Verification Code</h2><p>Your OTP is:</p><h1>${otp}</h1><p>This code is valid for 2 minutes.</p>`;
    await sendEmail(email, "Verify Your Email", message);
    return true;
  }

  //  Validate Registration OTP
  async validateRegistrationOTP(email, otp) {
    if (!otp) throw new Error("OTP is required.");

    const [record] = await sequelize.query(
      "SELECT * FROM email_verifications WHERE email = :email AND otp = :otp LIMIT 1",
      { replacements: { email, otp }, type: QueryTypes.SELECT },
    );
    if (!record) throw new Error("The OTP entered is invalid.");

    const expiryTime = new Date(record.updated_at).getTime() + 2 * 60 * 1000;
    if (Date.now() > expiryTime) throw new Error("The OTP has expired. Please request a new one.");

    const verificationToken = jwt.sign(
      { email, type: "email_verified" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "2m" },
    );
    return verificationToken;
  }

  //  Register User (Session Aware)
  async registerUser(data, files, verificationToken, deviceInfo = {}) {
    const { device_id } = deviceInfo;
    if (!device_id) throw new Error("Device ID is required for registration.");

    const { email, password, name, phone, additional_phone, user_type } = data;

    if (!verificationToken) {
      throw new Error(
        "Email verification required. Please verify your email to proceed.",
      );
    }

    let verifiedEmail;
    try {
      const decoded = jwt.verify(
        verificationToken,
        process.env.JWT_SECRET || "secret",
      );
      if (decoded.type !== "email_verified")
        throw new Error("The verification token is invalid.");
      verifiedEmail = decoded.email;
    } catch {
      throw new Error(
        "The verification token is invalid or has expired. Please verify your email again.",
      );
    }

    if (verifiedEmail !== email) {
      throw new Error("Email address mismatch. Please use the email address that was verified.");
    }

    // Check email duplicate
    const [existingEmail] = await sequelize.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (existingEmail) throw new Error("This email address is already registered.");

    // Check phone duplicate
    if (phone) {
      const [existingPhone] = await sequelize.query(
        "SELECT id FROM users WHERE phone = :phone OR additional_phone = :phone LIMIT 1",
        { replacements: { phone }, type: QueryTypes.SELECT },
      );
      if (existingPhone)
        throw new Error("This phone number is already associated with another account.");
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

    const [userId] = await sequelize.query(
      `INSERT INTO users (name, email, password, phone, additional_phone, user_type, profile, fcm_token, is_active, created_at, updated_at)
       VALUES (:name, :email, :password, :phone, :additional_phone, :user_type, :profile, :fcm_token, 1, NOW(), NOW())`,
      {
        replacements: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          additional_phone: additional_phone || null,
          user_type: user_type || "user",
          profile: JSON.stringify(profileObj),
          fcm_token: deviceInfo.fcm_token || null,
        },
        type: QueryTypes.INSERT,
      },
    );

    // Clear OTP
    await sequelize.query(
      "DELETE FROM email_verifications WHERE email = :email",
      { replacements: { email }, type: QueryTypes.DELETE },
    );

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken(userId);

    // Track Session
    await this.upsertSession(userId, deviceInfo, refreshToken);

    // Backward compatibility
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

  // ─── Enforce Device Limit Helper
  async enforceSessionLimit(userId, deviceId) {
    // 1. Get user's device limit from current active plan
    const [planData] = await sequelize.query(
      `SELECT p.device_limit 
       FROM plans p
       JOIN subscriptions s ON s.plan_id = p.id
       WHERE s.user_id = :userId AND s.status = 'active' AND s.end_date >= NOW()
       ORDER BY s.end_date DESC LIMIT 1`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    );

    // Default limit if no active premium plan found
    const deviceLimit = planData?.device_limit || 1; // Default 1 for free/unsubscribed users

    // 2. Count current active sessions for this user (excluding CURRENT device if it already exists)
    const sessions = await sequelize.query(
      `SELECT id FROM user_sessions WHERE user_id = :userId AND is_active = 1 AND device_id != :deviceId`,
      { replacements: { userId, deviceId }, type: QueryTypes.SELECT },
    );

    if (sessions.length >= deviceLimit) {
      throw new Error(
        `Device limit reached. Your subscription plan allows a maximum of ${deviceLimit} device(s). Please log out from another device to continue.`,
      );
    }

    return true;
  }

  // ─── Upsert Session Helper
  async upsertSession(userId, deviceInfo, refreshToken) {
    const { device_id, device_name, ip_address } = deviceInfo;

    // Check if session exists for this device
    const [existingSession] = await sequelize.query(
      "SELECT id FROM user_sessions WHERE user_id = :userId AND device_id = :device_id LIMIT 1",
      {
        replacements: { userId, device_id },
        type: QueryTypes.SELECT,
      },
    );

    if (existingSession) {
      // Update existing session
      await sequelize.query(
        `UPDATE user_sessions SET 
         refresh_token = :refreshToken, 
         device_name = :device_name, 
         ip_address = :ip_address, 
         is_active = 1,
         last_active = NOW(),
         updated_at = NOW() 
         WHERE id = :id`,
        {
          replacements: {
            refreshToken,
            device_name: device_name || "Unknown Device",
            ip_address: ip_address || null,
            id: existingSession.id,
          },
          type: QueryTypes.UPDATE,
        },
      );
    } else {
      // Create new session
      await sequelize.query(
        `INSERT INTO user_sessions (user_id, device_id, device_name, ip_address, refresh_token, is_active, last_active, created_at, updated_at)
         VALUES (:userId, :device_id, :device_name, :ip_address, :refreshToken, 1, NOW(), NOW(), NOW())`,
        {
          replacements: {
            userId,
            device_id,
            device_name: device_name || "Unknown Device",
            ip_address: ip_address || null,
            refreshToken,
          },
          type: QueryTypes.INSERT,
        },
      );
    }
  }

  // ─── Login
  async login(email, password, deviceInfo = {}) {
    const { device_id } = deviceInfo;
    if (!device_id) throw new Error("Device ID is required for login.");

    const [user] = await sequelize.query(
      "SELECT * FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (!user) throw new Error("Invalid email address or password.");
    if (!user.is_active)
      throw new Error("Your account has been deactivated. Please contact support for assistance.");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid email address or password.");

    // Enforce Device Limit
    await this.enforceSessionLimit(user.id, device_id);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Track Session
    await this.upsertSession(user.id, deviceInfo, refreshToken);

    // Update FCM Token and Refresh Token for backward compatibility
    await sequelize.query(
      "UPDATE users SET refresh_token = :refreshToken, fcm_token = COALESCE(:fcmToken, fcm_token) WHERE id = :id",
      {
        replacements: {
          refreshToken,
          fcmToken: deviceInfo.fcm_token || null,
          id: user.id,
        },
        type: QueryTypes.UPDATE,
      },
    );

    return {
      user_id: user.id,
      user_type: user.user_type,
      accessToken,
      refreshToken,
    };
  }

  // ─── Google Login
  async googleLogin(id_token, deviceInfo = {}) {
    const { device_id } = deviceInfo;
    if (!device_id) throw new Error("Device ID is required for login.");

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: id_token,
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

      const [insertId] = await sequelize.query(
        `INSERT INTO users (name, email, password, user_type, profile, fcm_token, is_active, is_verified, created_at, updated_at)
         VALUES (:name, :email, :password, 'user', :profile, :fcmToken, 1, 1, NOW(), NOW())`,
        {
          replacements: {
            name,
            email,
            password: randomPassword,
            profile: JSON.stringify(profileObj),
            fcmToken: deviceInfo.fcm_token || null,
          },
          type: QueryTypes.INSERT,
        },
      );

      const [newUser] = await sequelize.query(
        "SELECT * FROM users WHERE id = :id LIMIT 1",
        { replacements: { id: insertId }, type: QueryTypes.SELECT },
      );
      user = newUser;
    }

    if (!user.is_active)
      throw new Error("Your account is deactivated. Please contact support.");

    // Enforce Device Limit
    await this.enforceSessionLimit(user.id, device_id);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Track Session
    await this.upsertSession(user.id, deviceInfo, refreshToken);

    // Update FCM Token and Refresh Token
    await sequelize.query(
      "UPDATE users SET refresh_token = :refreshToken, fcm_token = COALESCE(:fcmToken, fcm_token) WHERE id = :id",
      {
        replacements: {
          refreshToken,
          fcmToken: deviceInfo.fcm_token || null,
          id: user.id,
        },
        type: QueryTypes.UPDATE,
      },
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

  // ─── Refresh Access Token (Session Aware)
  async refreshAccessToken(incomingRefreshToken, deviceId) {
    if (!incomingRefreshToken) {
      throw new Error("Unauthorized request. Refresh token is missing.");
    }

    try {
      const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET || "refresh_secret",
      );

      // 1. Verify token exists in active session
      const [session] = await sequelize.query(
        "SELECT * FROM user_sessions WHERE user_id = :userId AND refresh_token = :refreshToken AND is_active = 1 LIMIT 1",
        {
          replacements: {
            userId: decodedToken.id,
            refreshToken: incomingRefreshToken,
          },
          type: QueryTypes.SELECT,
        },
      );

      if (!session) {
        throw new Error("Invalid or expired session. Please log in again.");
      }

      // 2. Validate user status
      const [user] = await sequelize.query(
        "SELECT id, is_active FROM users WHERE id = :id LIMIT 1",
        { replacements: { id: decodedToken.id }, type: QueryTypes.SELECT },
      );

      if (!user) throw new Error("User account not found.");
      if (!user.is_active)
        throw new Error("Your account has been deactivated. Please contact support for assistance.");

      // 3. Generate new tokens
      const accessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      // 4. Update session
      await sequelize.query(
        "UPDATE user_sessions SET refresh_token = :newRefreshToken, last_active = NOW() WHERE id = :id",
        {
          replacements: { newRefreshToken, id: session.id },
          type: QueryTypes.UPDATE,
        },
      );

      // Backward compatibility update for User model
      await sequelize.query(
        "UPDATE users SET refresh_token = :newRefreshToken WHERE id = :id",
        {
          replacements: { newRefreshToken, id: user.id },
          type: QueryTypes.UPDATE,
        },
      );

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error(error?.message || "The refresh token is invalid.");
    }
  }

  // ─── Logout (Session Aware)
  async logout(userId, deviceId) {
    if (deviceId) {
      await sequelize.query(
        "UPDATE user_sessions SET is_active = 0, refresh_token = NULL WHERE user_id = :userId AND device_id = :deviceId",
        { replacements: { userId, deviceId }, type: QueryTypes.UPDATE },
      );
    } else {
      // Logout from all devices if no deviceId provided
      await sequelize.query(
        "UPDATE user_sessions SET is_active = 0, refresh_token = NULL WHERE user_id = :userId",
        { replacements: { userId }, type: QueryTypes.UPDATE },
      );
    }

    // Clear main user refresh token for safety
    await sequelize.query(
      "UPDATE users SET refresh_token = NULL WHERE id = :userId",
      { replacements: { userId }, type: QueryTypes.UPDATE },
    );

    return true;
  }

  // ─── Get User Sessions
  async getUserSessions(userId) {
    const sessions = await sequelize.query(
      "SELECT id, device_id, device_name, ip_address, last_active, created_at FROM user_sessions WHERE user_id = :userId AND is_active = 1 ORDER BY last_active DESC",
      { replacements: { userId }, type: QueryTypes.SELECT },
    );
    return sessions;
  }

  // ─── Terminate Specific Session
  async terminateSession(userId, sessionId) {
    await sequelize.query(
      "UPDATE user_sessions SET is_active = 0, refresh_token = NULL WHERE user_id = :userId AND id = :sessionId",
      { replacements: { userId, sessionId }, type: QueryTypes.UPDATE },
    );
    return true;
  }

  // ─── Terminate All Other Sessions
  async terminateAllOtherSessions(userId, currentDeviceId) {
    await sequelize.query(
      "UPDATE user_sessions SET is_active = 0, refresh_token = NULL WHERE user_id = :userId AND device_id != :currentDeviceId",
      { replacements: { userId, currentDeviceId }, type: QueryTypes.UPDATE },
    );
    return true;
  }

  // ─── Get User Profile
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

  // ─── Update Profile
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
      if (conflict) throw new Error("This email address is already in use by another account.");
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

  // ─── Change Password
  async changePassword(userId, data) {
    const { old_password, new_password, confirm_password } = data;
    if (new_password !== confirm_password)
      throw new Error("The passwords do not match.");

    const [user] = await sequelize.query(
      "SELECT id, password FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );
    if (!user) throw new Error("User account not found.");

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) throw new Error("The current password you entered is incorrect.");

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

  // ─── Forgot Password (OTP Based)
  async forgotPassword(email) {
    const [user] = await sequelize.query(
      "SELECT id, email FROM users WHERE email = :email LIMIT 1",
      { replacements: { email }, type: QueryTypes.SELECT },
    );
    if (!user) throw new Error("No account was found with this email address.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert OTP into email_verifications table
    await sequelize.query(
      `INSERT INTO email_verifications (email, otp, created_at, updated_at)
       VALUES (:email, :otp, NOW(), NOW())
       ON DUPLICATE KEY UPDATE otp = :otp, updated_at = NOW()`,
      { replacements: { email: user.email, otp }, type: QueryTypes.INSERT },
    );

    const message = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px;">
          <h1 style="color: #333; margin: 0;">Mind Gym Book</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #444; margin-top: 0;">Password Reset OTP</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Hello,<br><br>
            We received a request to reset your password. Use the OTP below to proceed:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; background-color: #007bff; color: white; padding: 14px 40px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #888; font-size: 14px; text-align: center;">
            This OTP is valid for <strong>2 minutes</strong>. Do not share it with anyone.<br>
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding-top: 20px; color: #999; font-size: 12px;">
          &copy; ${new Date().getFullYear()} Mind Gym Book. All rights reserved.
        </div>
      </div>
    `;

    await sendEmail(
      user.email,
      "Your Password Reset OTP - Mind Gym Book",
      message,
    );
    return true;
  }

  // ─── Verify Forgot Password OTP
  async verifyForgotPasswordOTP(email, otp) {
    if (!otp) throw new Error("OTP is required.");

    const [record] = await sequelize.query(
      "SELECT * FROM email_verifications WHERE email = :email AND otp = :otp LIMIT 1",
      { replacements: { email, otp }, type: QueryTypes.SELECT },
    );
    if (!record) throw new Error("The OTP entered is invalid. Please check and try again.");

    const expiryTime = new Date(record.updated_at).getTime() + 2 * 60 * 1000;
    if (Date.now() > expiryTime)
      throw new Error("The OTP has expired. Please request a new one.");

    // Generate a short-lived reset token
    const resetToken = jwt.sign(
      { email, type: "password_reset" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "15m" },
    );

    // Clear the OTP after successful verification
    await sequelize.query(
      "DELETE FROM email_verifications WHERE email = :email",
      { replacements: { email }, type: QueryTypes.DELETE },
    );

    return resetToken;
  }

  // ─── Reset Password (OTP Flow)
  async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
      if (!decoded || decoded.type !== "password_reset")
        throw new Error("Invalid or expired reset token.");

      const [user] = await sequelize.query(
        "SELECT id FROM users WHERE email = :email LIMIT 1",
        { replacements: { email: decoded.email }, type: QueryTypes.SELECT },
      );
      if (!user) throw new Error("User not found.");

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
        throw new Error("Reset token has expired. Please request a new OTP.");
      if (error.name === "JsonWebTokenError")
        throw new Error("Invalid reset token.");
      throw error;
    }
  }

  // ─── Get All Users (Paginated)
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

  // ─── Get User By ID
  async getUserById(userId) {
    return await this.getUserProfile(userId);
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

  // ─── Search Users (Admin)
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
  // ─── Toggle User Status (Admin)
  async toggleUserStatus(userId) {
    const [user] = await sequelize.query(
      "SELECT id, is_active FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );

    if (!user) throw new Error("User account not found.");

    const newStatus = user.is_active ? 0 : 1;

    await sequelize.query(
      "UPDATE users SET is_active = :newStatus, updated_at = NOW() WHERE id = :id",
      {
        replacements: { newStatus, id: userId },
        type: QueryTypes.UPDATE,
      },
    );

    const [updatedUser] = await sequelize.query(
      "SELECT id, is_active FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );

    return updatedUser;
  }

  // ─── Delete User (Admin)
  async deleteUser(userId) {
    const [user] = await sequelize.query(
      "SELECT id, email, profile, address_ids FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: userId }, type: QueryTypes.SELECT },
    );

    if (!user) throw new Error("User account not found.");

    // 1. Delete profile image from Cloudinary
    let profile = user.profile;
    if (typeof profile === "string") {
      try {
        profile = JSON.parse(profile);
      } catch (e) {
        profile = {};
      }
    }
    if (profile?.public_id) {
      try {
        await deleteFromCloudinary(profile.public_id);
      } catch (err) {
        console.error("[CLOUDINARY DELETE ERROR]:", err.message);
      }
    }

    // 2. Delete related records (Manual Cascade)
    // Temporarily disable FK checks to avoid dependency issues (e.g. Subscriptions referencing Payments)
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0;");
    try {
      const tables = [
        "user_sessions",
        "carts",
        "wishlists",
        "subscriptions",
        "payments",
        "user_notes",
        "user_books",
        "bookmarks",
        "reviews",
        "notifications",
        "user_favorite_categories",
        "reading_progress",
        "highlights",
      ];

      for (const table of tables) {
        await sequelize.query(`DELETE FROM ${table} WHERE user_id = :userId`, {
          replacements: { userId },
          type: QueryTypes.DELETE,
        });
      }

      // Special cases:
      // Support Messages (linked via sender_id)
      await sequelize.query(
        "DELETE FROM support_messages WHERE sender_id = :userId",
        { replacements: { userId }, type: QueryTypes.DELETE },
      );

      // Support Tickets & their messages
      const tickets = await sequelize.query(
        "SELECT id FROM support_tickets WHERE user_id = :userId",
        { replacements: { userId }, type: QueryTypes.SELECT },
      );
      for (const ticket of tickets) {
        await sequelize.query(
          "DELETE FROM support_messages WHERE ticket_id = :ticketId",
          { replacements: { ticketId: ticket.id }, type: QueryTypes.DELETE },
        );
      }
      await sequelize.query(
        "DELETE FROM support_tickets WHERE user_id = :userId",
        { replacements: { userId }, type: QueryTypes.DELETE },
      );

      // Orders & their items
      const orders = await sequelize.query(
        "SELECT id FROM orders WHERE user_id = :userId",
        { replacements: { userId }, type: QueryTypes.SELECT },
      );
      for (const order of orders) {
        await sequelize.query(
          "DELETE FROM order_items WHERE order_id = :orderId",
          { replacements: { orderId: order.id }, type: QueryTypes.DELETE },
        );
      }
      await sequelize.query("DELETE FROM orders WHERE user_id = :userId", {
        replacements: { userId },
        type: QueryTypes.DELETE,
      });

      // Addresses
      let addressIds = user.address_ids;
      if (typeof addressIds === "string") {
        try {
          addressIds = JSON.parse(addressIds);
        } catch (e) {
          addressIds = [];
        }
      }

      if (Array.isArray(addressIds) && addressIds.length > 0) {
        const placeholders = addressIds.map((_, i) => `:id${i}`).join(", ");
        const replacements = {};
        addressIds.forEach((id, i) => {
          replacements[`id${i}`] = id;
        });
        await sequelize.query(
          `DELETE FROM addresses WHERE id IN (${placeholders})`,
          { replacements, type: QueryTypes.DELETE },
        );
      }

      // Email Verifications (linked via email)
      await sequelize.query(
        "DELETE FROM email_verifications WHERE email = :email",
        { replacements: { email: user.email }, type: QueryTypes.DELETE },
      );

      // 3. Finally delete the user
      await sequelize.query("DELETE FROM users WHERE id = :id", {
        replacements: { id: userId },
        type: QueryTypes.DELETE,
      });
    } finally {
      // Re-enable FK checks
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1;");
    }

    return true;
  }
}

export default new UserService();
