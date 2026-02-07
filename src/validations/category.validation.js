import { body } from 'express-validator';

export const categoryValidation = [
    body('name').notEmpty().withMessage('Category name is required').trim(),
    body('description').optional().trim(),
    body('parent_id').optional({ checkFalsy: true }).isInt().withMessage('Parent ID must be an integer'),
];

export const updateCategoryValidation = [
    body('name').optional().notEmpty().withMessage('Category name cannot be empty').trim(),
    body('description').optional().trim(),
    body('parent_id').optional({ checkFalsy: true }).isInt().withMessage('Parent ID must be an integer'),
];
