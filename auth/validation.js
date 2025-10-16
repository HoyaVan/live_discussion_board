const Joi = require('joi');

// Thread validation schema
const threadValidationSchema = Joi.object({
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      "string.min": "Title must be at least 5 characters.",
      "string.max": "Title must be less than 200 characters.",
      "any.required": "Title is required.",
    }),
  body: Joi.string()
    .min(10)
    .required()
    .messages({
      "string.min": "Description must be at least 10 characters.",
      "any.required": "Description is required.",
    })
});

// User signup validation schema
const signupValidationSchema = Joi.object({
  username: Joi.string()
    .max(20)
    .required()
    .messages({
      "string.max": "Username must be less than 20 characters.",
      "any.required": "Username is required.",
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email format.",
      "any.required": "Email is required.",
    }),
  password: Joi.string()
    .min(10)
    .pattern(
      new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_]).{10,}$")
    )
    .required()
    .messages({
      "string.min": "Password must be at least 10 characters.",
      "string.pattern.base":
        "Password must contain uppercase, lowercase, numbers, and symbols.",
      "any.required": "Password is required.",
    }),
});

// Login validation schema
const loginValidationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email format.",
      "any.required": "Email is required.",
    }),
  password: Joi.string()
    .required()
    .messages({
      "any.required": "Password is required.",
    })
});

// Validation functions
function validateThread(data) {
  return threadValidationSchema.validate(data, { abortEarly: false });
}

function validateSignup(data) {
  return signupValidationSchema.validate(data, { abortEarly: false });
}

function validateLogin(data) {
  return loginValidationSchema.validate(data, { abortEarly: false });
}

// Helper function to format validation errors
function formatValidationErrors(validationResult) {
  if (validationResult.error) {
    return validationResult.error.details.map(d => d.message).join(', ');
  }
  return null;
}

module.exports = {
  validateThread,
  validateSignup,
  validateLogin,
  formatValidationErrors,
  threadValidationSchema,
  signupValidationSchema,
  loginValidationSchema
};