import Joi from "joi";

// ─── Valid ENUM types (must match model)
const NOTIFICATION_TYPES = [
  "ORDER",
  "RENEWAL",
  "APPROVAL",
  "PRICE_DROP",
  "NEW_RELEASE",
  "SALE",
  "REFUND_REQUEST",
];

// ─── Register FCM Token
export const registerFCMTokenValidation = Joi.object({
  fcm_token: Joi.string().required().trim().messages({
    "string.empty": "FCM token cannot be empty",
    "any.required": "FCM token is required",
  }),
});

export const sendNotificationValidation = Joi.object({
  target: Joi.string()
    .valid("ALL", "CATEGORY", "USER", "SUBSCRIBED", "WISHLIST", "EXPIRING")
    .required()
    .messages({
      "any.only":
        "Target must be one of [ALL, CATEGORY, USER, SUBSCRIBED, WISHLIST, EXPIRING]",
    }),
  user_id: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  type: Joi.string()
    .valid(...NOTIFICATION_TYPES)
    .required(),
  title: Joi.string().required().trim().max(255),
  message: Joi.string().required().trim(),
  metadata: Joi.object().optional().allow(null),
  status: Joi.string()
    .valid("SENT", "PENDING", "RECURRING", "FAILED")
    .optional(),
  scheduled_at: Joi.date().iso().optional().allow(null),
  send_push: Joi.boolean().optional(),
  send_email: Joi.boolean().optional(),
});

// ─── Add Favorite Category
export const addFavoriteCategoryValidation = Joi.object({
  category_id: Joi.number().integer().positive().required().messages({
    "number.base": "category_id must be a number",
    "any.required": "category_id is required",
  }),
});

// ─── Sync Favorite Categories
export const syncFavoriteCategoriesValidation = Joi.object({
  category_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .required()
    .messages({
      "array.base": "category_ids must be an array of numbers",
      "any.required": "category_ids is required",
    }),
});
