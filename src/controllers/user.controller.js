import userService from "../services/user.service.js";
import sendResponse from "../utils/responseHandler.js";

export const sendRegistrationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    await userService.sendRegistrationOTP(email);
    return sendResponse(res, 200, true, "Registration OTP sent successfully");
  } catch (error) {
    next(error);
  }
};

export const verifyRegistrationOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const verificationToken = await userService.validateRegistrationOTP(
      email,
      otp,
    );

    // Set verification token as cookie
    const options = {
      expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };
    res.cookie("verificationToken", verificationToken, options);

    return sendResponse(
      res,
      200,
      true,
      "Email verified successfully. You can now register.",
      { verificationToken },
    );
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const verificationToken =
      req.cookies?.verificationToken || req.body.verificationToken;
    const result = await userService.registerUser(
      req.body,
      req.files,
      verificationToken,
    );

    // Clear verification token after successful registration
    res.clearCookie("verificationToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    return sendResponse(
      res,
      201,
      true,
      "User registered successfully.",
      result.user,
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await userService.login(email, password);

    const accessTokenOptions = {
      expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    const refreshTokenOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    const { accessToken, refreshToken, ...userWithoutTokens } = result;

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    return sendResponse(res, 200, true, "Login successful", {
      user: userWithoutTokens,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);

    return sendResponse(res, 200, true, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken;

    const result = await userService.refreshAccessToken(incomingRefreshToken);

    const accessTokenOptions = {
      expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    const refreshTokenOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };

    res.cookie("accessToken", result.accessToken, accessTokenOptions);
    res.cookie("refreshToken", result.refreshToken, refreshTokenOptions);

    return sendResponse(res, 200, true, "Access token refreshed", result);
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user.id);
    return sendResponse(
      res,
      200,
      true,
      "User profile fetched successfully",
      user,
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(
      req.user.id,
      req.body,
      req.files,
    );
    return sendResponse(res, 200, true, "Profile updated successfully", user);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await userService.changePassword(req.user.id, req.body);
    return sendResponse(res, 200, true, "Password changed successfully");
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await userService.forgotPassword(email);
    return sendResponse(
      res,
      200,
      true,
      "Password reset link sent to your email",
    );
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    await userService.resetPassword(token, new_password);
    return sendResponse(res, 200, true, "Password has been reset successfully");
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    await userService.deleteAccount(req.user.id, password);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    return sendResponse(res, 200, true, "Account deleted successfully");
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await userService.getAllUsers(page, limit);
    return sendResponse(
      res,
      200,
      true,
      "Users list fetched successfully",
      result,
    );
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.updateProfile(id, req.body, req.files);
    return sendResponse(res, 200, true, "User updated successfully", user);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }
    return sendResponse(res, 200, true, "User fetched successfully", user);
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await userService.searchUsers(q, page, limit);

    if (result.users.length === 0) {
      return sendResponse(
        res,
        200,
        true,
        "No users found matches your search",
        {
          users: [],
          totalItems: 0,
          totalPages: 0,
          currentPage: page,
        },
      );
    }
    return sendResponse(res, 200, true, "Search results fetched", result);
  } catch (error) {
    next(error);
  }
};
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);
    return sendResponse(res, 200, true, "User deleted successfully");
  } catch (error) {
    next(error);
  }
};
