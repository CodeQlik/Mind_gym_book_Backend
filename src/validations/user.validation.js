import Joi from "joi";

export const registerValidation = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Name is required",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
  phone: Joi.string().required().messages({
    "string.empty": "Phone number is required",
    "any.required": "Phone number is required",
  }),
  additional_phone: Joi.string()
    .optional()
    .allow(null, "")
    .not(Joi.ref("phone"))
    .messages({
      "any.invalid":
        "Additional phone number must be different from the primary phone number",
    }),
});

export const loginValidation = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

export const updateProfileValidation = Joi.object({
  name: Joi.string().optional().not().empty().messages({
    "string.empty": "Name cannot be empty",
  }),
  email: Joi.string().email().optional().messages({
    "string.email": "Please provide a valid email",
  }),
  phone: Joi.string().optional().not().empty().messages({
    "string.empty": "Phone number cannot be empty",
  }),
  additional_phone: Joi.string()
    .optional()
    .allow(null, "")
    .not(Joi.ref("phone"))
    .messages({
      "any.invalid":
        "Additional phone number must be different from the primary phone number",
    }),
});

export const changePasswordValidation = Joi.object({
  old_password: Joi.string().required().messages({
    "string.empty": "Old password is required",
    "any.required": "Old password is required",
  }),
  new_password: Joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters long",
    "string.empty": "New password is required",
    "any.required": "New password is required",
  }),
  confirm_password: Joi.string()
    .required()
    .valid(Joi.ref("new_password"))
    .messages({
      "any.only": "Password confirmation does not match password",
      "any.required": "Confirm password is required",
    }),
});

export const forgotPasswordValidation = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
});

export const resetPasswordValidation = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Reset token is required",
    "any.required": "Reset token is required",
  }),
  new_password: Joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters long",
    "string.empty": "New password is required",
    "any.required": "New password is required",
  }),
  confirm_password: Joi.string()
    .required()
    .valid(Joi.ref("new_password"))
    .messages({
      "any.only": "Password confirmation does not match password",
      "any.required": "Confirm password is required",
    }),
});

export const deleteAccountValidation = Joi.object({
  password: Joi.string().required().messages({
    "string.empty": "Password is required to delete account",
    "any.required": "Password is required to delete account",
  }),
});

export const verifyEmailValidation = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
  otp: Joi.string().length(6).required().messages({
    "string.length": "OTP must be 6 digits",
    "string.empty": "OTP is required",
    "any.required": "OTP is required",
  }),
});

export const sendOTPValidation = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  }),
});
