import Joi from "joi";

export const categoryValidation = Joi.object({
  name: Joi.string().required().trim().messages({
    "string.empty": "Category name is required",
    "any.required": "Category name is required",
  }),
  description: Joi.string().optional().trim().allow(""),
  is_active: Joi.boolean().optional().messages({
    "boolean.base": "is_active must be a boolean",
  }),
});

export const updateCategoryValidation = Joi.object({
  name: Joi.string().optional().not().empty().trim().messages({
    "string.empty": "Category name cannot be empty",
  }),
  description: Joi.string().optional().trim().allow(""),
  is_active: Joi.boolean().optional().messages({
    "boolean.base": "is_active must be a boolean",
  }),
});
