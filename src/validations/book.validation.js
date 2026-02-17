import Joi from "joi";

export const bookValidation = Joi.object({
  title: Joi.string().required().trim().messages({
    "string.empty": "Book title is required",
    "any.required": "Book title is required",
  }),
  author: Joi.string().required().trim().messages({
    "string.empty": "Author is required",
    "any.required": "Author is required",
  }),
  description: Joi.string().required().trim().messages({
    "string.empty": "Description is required",
    "any.required": "Description is required",
  }),
  price: Joi.number().required().messages({
    "number.base": "Price must be a valid number",
    "any.required": "Price is required",
  }),
  original_price: Joi.number().required().messages({
    "number.base": "Original price must be a valid number",
    "any.required": "Original price is required",
  }),
  category_id: Joi.number().integer().required().messages({
    "number.base": "Category ID must be a number",
    "number.integer": "Category ID must be an integer",
    "any.required": "Category ID is required",
  }),
  stock: Joi.number().integer().min(0).optional().messages({
    "number.min": "Stock must be a non-negative integer",
  }),
  condition: Joi.string()
    .valid("new", "fair", "good", "acceptable")
    .optional()
    .messages({
      "any.only": "Invalid book condition",
    }),
  published_date: Joi.date().optional().allow(null, "").messages({
    "date.base": "Published date must be a valid date",
  }),
  is_premium: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .optional(),
  isbn: Joi.string().optional().trim().allow(null, ""),
  language: Joi.string().optional().trim().allow(null, ""),
  is_bestselling: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .optional(),
  is_trending: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .optional(),
  highlights: Joi.string().optional().trim().allow(null, ""),
  otherdescription: Joi.string().optional().trim().allow(null, ""),
});

export const updateBookValidation = Joi.object({
  title: Joi.string().optional().not().empty().trim().messages({
    "string.empty": "Title cannot be empty",
  }),
  author: Joi.string().optional().not().empty().trim().messages({
    "string.empty": "Author cannot be empty",
  }),
  description: Joi.string().optional().not().empty().trim().messages({
    "string.empty": "Description cannot be empty",
  }),
  price: Joi.number().optional().messages({
    "number.base": "Price must be a valid number",
  }),
  original_price: Joi.number().optional().messages({
    "number.base": "Original price must be a valid number",
  }),
  category_id: Joi.number().integer().optional().messages({
    "number.base": "Category ID must be an integer",
  }),
  stock: Joi.number().integer().min(0).optional().messages({
    "number.min": "Stock must be a non-negative integer",
  }),
  condition: Joi.string()
    .valid("new", "fair", "good", "acceptable")
    .optional()
    .messages({
      "any.only": "Invalid book condition",
    }),
  published_date: Joi.date().optional().allow(null, "").messages({
    "date.base": "Published date must be a valid date",
  }),
  is_premium: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .optional(),
  isbn: Joi.string().optional().trim().allow(null, ""),
  language: Joi.string().optional().trim().allow(null, ""),
  is_bestselling: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .optional(),
  is_trending: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .optional(),
  highlights: Joi.string().optional().trim().allow(null, ""),
  otherdescription: Joi.string().optional().trim().allow(null, ""),
});
