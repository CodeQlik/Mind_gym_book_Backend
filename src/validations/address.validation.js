import { body } from 'express-validator';

export const addressValidation = [
    body('street').notEmpty().withMessage('Street is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('state').notEmpty().withMessage('State is required'),
    body('pin_code').notEmpty().withMessage('Pin code is required').isNumeric().withMessage('Pin code must be numeric'),
    body('addresstype').notEmpty().withMessage('Address type is required').isIn(['home', 'work', 'other']).withMessage('Invalid address type'),
];
