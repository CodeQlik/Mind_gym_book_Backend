import { body } from 'express-validator';

export const bookValidation = [
    body('title').notEmpty().withMessage('Book title is required').trim(),
    body('price').isDecimal().withMessage('Price must be a valid number'),
    body('category_id').notEmpty().withMessage('Category ID is required').isInt().withMessage('Category ID must be an integer'),
];

export const updateBookValidation = [
    body('title').optional().notEmpty().withMessage('Title cannot be empty').trim(),
    body('price').optional().isDecimal().withMessage('Price must be a valid number'),
    body('category_id').optional().isInt().withMessage('Category ID must be an integer'),
];
