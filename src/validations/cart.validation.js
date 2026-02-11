import { body } from "express-validator";

export const addToCartValidation = [
  body("book_id")
    .notEmpty()
    .withMessage("Book ID is required")
    .isInt()
    .withMessage("Book ID must be an integer"),
  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];

export const updateQuantityValidation = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
];
