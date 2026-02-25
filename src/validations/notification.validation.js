import Joi from "joi";

// ─── Valid ENUM types (must match model) ─────────────────────────────────────
const NOTIFICATION_TYPES = [
  "ORDER",
  "RENEWAL",
  "APPROVAL",
  "PRICE_DROP",
  "NEW_RELEASE",
  "SALE",
];

// ─── Register FCM Token ───────────────────────────────────────────────────────
export const registerFCMTokenValidation = Joi.object({
  fcm_token: Joi.string().required().trim().messages({
    "string.empty": "FCM token cannot be empty",
    "any.required": "FCM token is required",
  }),
});

// ─── Admin: Send Notification to User ────────────────────────────────────────
export const sendNotificationValidation = Joi.object({
  target: Joi.string().valid("ALL", "CATEGORY", "USER").default("USER"),
  user_id: Joi.number().integer().positive().when("target", {
    is: "USER",
    then: Joi.required(),
  }),
  category_id: Joi.number().integer().positive().when("target", {
    is: "CATEGORY",
    then: Joi.required(),
  }),
  type: Joi.string()
    .valid(...NOTIFICATION_TYPES)
    .required()
    .messages({
      "any.only": `type must be one of: ${NOTIFICATION_TYPES.join(", ")}`,
      "any.required": "type is required",
    }),
  title: Joi.string().required().trim().max(255),
  message: Joi.string().required().trim(),
  metadata: Joi.object().optional().allow(null),
});

// ─── Add Favorite Category ────────────────────────────────────────────────────
export const addFavoriteCategoryValidation = Joi.object({
  category_id: Joi.number().integer().positive().required().messages({
    "number.base": "category_id must be a number",
    "any.required": "category_id is required",
  }),
});

// ─── Sync Favorite Categories ─────────────────────────────────────────────────
export const syncFavoriteCategoriesValidation = Joi.object({
  category_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .required()
    .messages({
      "array.base": "category_ids must be an array of numbers",
      "any.required": "category_ids is required",
    }),
});
