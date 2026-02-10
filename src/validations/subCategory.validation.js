import { body } from "express-validator";

export const subcategoryValidation = [
  body("name").notEmpty().withMessage("Subcategory name zaroori hai"),
  body("category_id")
    .notEmpty()
    .withMessage("Main category select karna zaroori hai"),
  body("description").optional().isString(),
];

export const updateSubcategoryValidation = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Subcategory name khali nahi ho sakta"),
  body("category_id")
    .optional()
    .notEmpty()
    .withMessage("Main category select karna zaroori hai"),
  body("description").optional().isString(),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active boolean hona chahiye"),
];
