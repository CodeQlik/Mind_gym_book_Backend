import userService from '../services/user.service.js';
import sendResponse from '../utils/responseHandler.js';
import { validationResult } from 'express-validator';

export const registerUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendResponse(res, 400, false, errors.array()[0].msg, errors.array());
        }

        const user = await userService.registerUser(req.body, req.files);
        return sendResponse(res, 201, true, "User registered successfully", user);
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendResponse(res, 400, false, errors.array()[0].msg, errors.array());
        }

        const { email, password } = req.body;
        const result = await userService.login(email, password);

        const options = {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None'
        };


        res.cookie('token', result.token, options);

        return sendResponse(res, 200, true, "Login successful", result);
    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None'
        });

        return sendResponse(res, 200, true, "Logged out successfully");
    } catch (error) {
        next(error);
    }
};

export const getUserProfile = async (req, res, next) => {
    try {
        const user = await userService.getUserProfile(req.user.id);
        return sendResponse(res, 200, true, "User profile fetched successfully", user);
    } catch (error) {
        next(error);
    }
};




