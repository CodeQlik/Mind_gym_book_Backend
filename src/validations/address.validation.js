import Joi from "joi";

export const addressValidation = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Name is required",
    "any.required": "Name is required",
  }),
  phone: Joi.string().required().messages({
    "string.empty": "Phone number is required",
    "any.required": "Phone number is required",
  }),
  address_line1: Joi.string().required().messages({
    "string.empty": "Address Line 1 is required",
    "any.required": "Address Line 1 is required",
  }),
  address_line2: Joi.string().allow("").optional(),
  city: Joi.string().required().messages({
    "string.empty": "City is required",
    "any.required": "City is required",
  }),
  state: Joi.string().required().messages({
    "string.empty": "State is required",
    "any.required": "State is required",
  }),
  pincode: Joi.string()
    .required()
    .pattern(/^[0-9]+$/)
    .messages({
      "string.empty": "Pincode is required",
      "any.required": "Pincode is required",
      "string.pattern.base": "Pincode must be numeric",
    }),
  country: Joi.string().optional().default("India"),
  addresstype: Joi.string().required().valid("home", "work", "other").messages({
    "string.empty": "Address type is required",
    "any.required": "Address type is required",
    "any.only": "Invalid address type",
  }),
  is_default: Joi.boolean().optional().default(false),
});
