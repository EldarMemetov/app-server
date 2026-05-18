import Joi from 'joi';
import { emailRegexp } from '../constants/users.js';

export const contactMessageSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  email: Joi.string().pattern(emailRegexp).required(),
  message: Joi.string().min(10).max(2000).required(),
  agreedToPolicy: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the privacy policy',
    'any.required': 'You must agree to the privacy policy',
  }),
});
