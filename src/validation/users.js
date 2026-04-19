import Joi from 'joi';
import { emailRegexp } from '../constants/users.js';
import { roles } from '../constants/roles.js';
import { directionsEnum } from '../constants/rolesEnum.js';

// Переиспользуемая схема для socialLinks
const socialLinksSchema = Joi.object({
  telegram: Joi.string().uri().allow('').optional(),
  whatsapp: Joi.string().uri().allow('').optional(),
  instagram: Joi.string().uri().allow('').optional(),
  facebook: Joi.string().uri().allow('').optional(),
  linkedin: Joi.string().uri().allow('').optional(),
  website: Joi.string().uri().allow('').optional(),
});

// Переиспользуемая схема для элемента портфолио
const portfolioItemSchema = Joi.object({
  type: Joi.string().valid('photo', 'video').required(),
  url: Joi.string().uri().required(),
  // videoLink — ссылка на YouTube/Vimeo/etc (только для type: 'video')
  videoLink: Joi.string().uri().allow('').optional(),
  description: Joi.string().max(200).allow('').optional(),
});

export const userSignupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  surname: Joi.string().min(2).max(50).required(),
  country: Joi.string().min(2).max(100).required(),
  city: Joi.string().min(2).max(50).required(),
  photo: Joi.string().uri().optional(),
  email: Joi.string().pattern(emailRegexp).required(),
  roles: Joi.array()
    .items(Joi.string().valid(...roles))
    .min(1)
    .max(3)
    .required(),
  password: Joi.string().min(6).max(128).required(),
  directions: Joi.array()
    .items(Joi.string().valid(...directionsEnum))
    .max(6)
    .optional(),
});

export const userSigninSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
  password: Joi.string().min(6).required(),
});

export const userLoginWithGoogleOAuthSchema = Joi.object({
  code: Joi.string().required(),
});

export const userUpdateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  surname: Joi.string().min(2).max(50).optional(),
  country: Joi.string().min(2).max(100).optional(),
  city: Joi.string().min(2).max(50).optional(),
  photo: Joi.string().uri().optional(),
  aboutMe: Joi.string().max(500).allow('').optional(),
  experience: Joi.string().max(500).allow('').optional(),

  roles: Joi.array()
    .items(Joi.string().valid(...roles))
    .min(1)
    .max(3)
    .optional(),

  directions: Joi.array()
    .items(Joi.string().valid(...directionsEnum))
    .max(6)
    .optional(),

  onlineStatus: Joi.boolean().optional(),

  portfolio: Joi.array().items(portfolioItemSchema).optional(),

  // Соцсети и сайт — единый объект, можно передавать частично
  socialLinks: socialLinksSchema.optional(),

  availability: Joi.string()
    .valid('local', 'country', 'international')
    .optional(),

  languages: Joi.array().items(Joi.string().min(2).max(50)).optional(),
});
