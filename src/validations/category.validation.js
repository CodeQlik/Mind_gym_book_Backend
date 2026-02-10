import { body } from "express-validator";

export const categoryValidation = [
  body("name").notEmpty().withMessage("Category name is required").trim(),
  body("description").optional().trim(),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

export const updateCategoryValidation = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Category name cannot be empty")
    .trim(),
  body("description").optional().trim(),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];
