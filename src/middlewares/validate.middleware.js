import sendResponse from "../utils/responseHandler.js";

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    return sendResponse(res, 400, false, errorMessage, error.details);
  }
  next();
};

export default validate;
