import { body } from 'express-validator';

export const registerValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('additional_phone').custom((value, { req }) => {
        if (value && value === req.body.phone) {
            throw new Error('Additional phone number must be different from the primary phone number');
        }
        return true;
    }),
];

export const loginValidation = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
];

export const updateProfileValidation = [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
    body('additional_phone').optional().custom((value, { req }) => {
        if (value && value === req.body.phone) {
            throw new Error('Additional phone number must be different from the primary phone number');
        }
        return true;
    }),
];

export const changePasswordValidation = [
    body('old_password').notEmpty().withMessage('Old password is required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.new_password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    }),
];

export const forgotPasswordValidation = [
    body('email').isEmail().withMessage('Please provide a valid email'),
];

export const resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.new_password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    }),
]; export const deleteAccountValidation = [
    body('password').notEmpty().withMessage('Password is required to delete account'),
];

export const verifyEmailValidation = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

export const sendOTPValidation = [
    body('email').isEmail().withMessage('Please provide a valid email'),
];
