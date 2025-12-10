import Joi from 'joi';
import { emailRegexp } from '../constants/users.js';
import { roles } from '../constants/roles.js';
import { directionsEnum } from '../constants/rolesEnum.js';

export const userSignupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  surname: Joi.string().min(2).max(50).required(),
  country: Joi.string().min(2).max(100).required(),
  city: Joi.string().min(2).max(50).required(),
  photo: Joi.string().uri(),
  email: Joi.string().pattern(emailRegexp).required(),
  roles: Joi.array()
    .items(Joi.string().valid(...roles))
    .min(1)
    .max(3)
    .required(),
  password: Joi.string().min(6).max(128).required(),
  directions: Joi.array()
    .items(Joi.string().valid(...directionsEnum))
    .max(6),
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
  country: Joi.string().min(2).max(100),
  city: Joi.string().min(2).max(50),
  photo: Joi.string().uri(),
  aboutMe: Joi.string().max(500),
  experience: Joi.string().max(500),
  roles: Joi.array()
    .items(Joi.string().valid(...roles))
    .min(1)
    .max(3),
  directions: Joi.array()
    .items(Joi.string().valid(...directionsEnum))
    .max(6),
  onlineStatus: Joi.boolean(),
  portfolio: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('photo', 'video').required(),
      url: Joi.string().uri().required(),
      description: Joi.string().max(200),
    }),
  ),
});
