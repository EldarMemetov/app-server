import Joi from 'joi';
import { emailRegexp } from '../constants/users.js';

export const userSignupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  surname: Joi.string().min(2).max(50).required(),
  city: Joi.string().min(2).max(50).required(),
  photo: Joi.string().uri().required(),
  email: Joi.string().pattern(emailRegexp).required(),
  role: Joi.string()
    .valid(
      'model',
      'photographer',
      'videographer',
      'designer',
      'producer',
      'director',
      'editor',
      'retoucher',
      'business',
      'host',
      'dj',
      'fashionOwner',
      'stylist',
      'lighting',
      'soundEngineer',
    )
    .required(),
  password: Joi.string().min(6).max(128).required(),
});

export const userSigninSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
  password: Joi.string().min(6).required(),
});

export const userLoginWithGoogleOAuthSchema = Joi.object({
  code: Joi.string().required(),
});

export const userUpdateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  surname: Joi.string().min(2).max(50),
  city: Joi.string().min(2).max(50),
  photo: Joi.string().uri(),
  aboutMe: Joi.string().max(500),
  experience: Joi.string().max(500),
  directions: Joi.array().items(Joi.string()),
  onlineStatus: Joi.boolean(),
  portfolio: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('photo', 'video').required(),
      url: Joi.string().uri().required(),
      description: Joi.string().max(200),
    }),
  ),
});
