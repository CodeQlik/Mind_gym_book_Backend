import sendResponse from "../utils/responseHandler.js";

const validate = (schema) => (req, res, next) => {
  const { value, error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(", ");
    return sendResponse(res, 400, false, errorMessage, error.details);
  }

  // Update req.body with the validated (and possibly coerced) values
  req.body = value;
  next();
};

export default validate;
