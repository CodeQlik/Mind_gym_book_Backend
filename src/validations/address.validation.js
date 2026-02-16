import Joi from "joi";

export const addressValidation = Joi.object({
  street: Joi.string().required().messages({
    "string.empty": "Street is required",
    "any.required": "Street is required",
  }),
  city: Joi.string().required().messages({
    "string.empty": "City is required",
    "any.required": "City is required",
  }),
  state: Joi.string().required().messages({
    "string.empty": "State is required",
    "any.required": "State is required",
  }),
  pin_code: Joi.string()
    .required()
    .pattern(/^[0-9]+$/)
    .messages({
      "string.empty": "Pin code is required",
      "any.required": "Pin code is required",
      "string.pattern.base": "Pin code must be numeric",
    }),
  addresstype: Joi.string().required().valid("home", "work", "other").messages({
    "string.empty": "Address type is required",
    "any.required": "Address type is required",
    "any.only": "Invalid address type",
  }),
});
