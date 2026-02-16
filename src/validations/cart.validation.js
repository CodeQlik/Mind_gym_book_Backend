import Joi from "joi";

export const addToCartValidation = Joi.object({
  book_id: Joi.number().integer().required().messages({
    "number.base": "Book ID must be a number",
    "number.integer": "Book ID must be an integer",
    "any.required": "Book ID is required",
  }),
  quantity: Joi.number().integer().min(1).optional().messages({
    "number.min": "Quantity must be at least 1",
  }),
});

export const updateQuantityValidation = Joi.object({
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Quantity must be a number",
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity must be at least 1",
    "any.required": "Quantity is required",
  }),
});
