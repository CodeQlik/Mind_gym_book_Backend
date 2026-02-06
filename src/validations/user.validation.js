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
