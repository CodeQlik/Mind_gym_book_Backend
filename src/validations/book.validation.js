import { body } from "express-validator";

export const bookValidation = [
  body("title").notEmpty().withMessage("Book title is required").trim(),
  body("author").notEmpty().withMessage("Author is required").trim(),
  body("price").isDecimal().withMessage("Price must be a valid number"),
  body("category_id")
    .notEmpty()
    .withMessage("Category ID is required")
    .isInt()
    .withMessage("Category ID must be an integer"),
  body("subcategory_id")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("Subcategory ID must be an integer"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("condition")
    .optional()
    .isIn(["new", "fair", "good", "acceptable"])
    .withMessage("Invalid book condition"),
  body("published_date")
    .optional({ checkFalsy: true })
    .isDate()
    .withMessage("Published date must be a valid date"),
  body("is_premium")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage("is_premium must be a boolean"),
];

export const updateBookValidation = [
  body("title")
    .optional()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .trim(),
  body("author")
    .optional()
    .notEmpty()
    .withMessage("Author cannot be empty")
    .trim(),
  body("price")
    .optional()
    .isDecimal()
    .withMessage("Price must be a valid number"),
  body("category_id")
    .optional()
    .isInt()
    .withMessage("Category ID must be an integer"),
  body("subcategory_id")
    .optional({ checkFalsy: true })
    .isInt()
    .withMessage("Subcategory ID must be an integer"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("condition")
    .optional()
    .isIn(["new", "fair", "good", "acceptable"])
    .withMessage("Invalid book condition"),
  body("published_date")
    .optional({ checkFalsy: true })
    .isDate()
    .withMessage("Published date must be a valid date"),
  body("is_premium")
    .optional()
    .toBoolean()
    .isBoolean()
    .withMessage("is_premium must be a boolean"),
];
