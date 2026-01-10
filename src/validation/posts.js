import Joi from 'joi';
import { roles } from '../constants/roles.js';

export const createPostSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(2000).required(),
  media: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('photo', 'video').required(),
        url: Joi.string().uri().required(),
      }),
    )
    .optional(),
  roleSlots: Joi.array()
    .items(
      Joi.object({
        role: Joi.string()
          .valid(...roles)
          .required(),
        required: Joi.number().min(1).required(),
      }),
    )
    .optional(),

  country: Joi.string().min(2).max(100).required(),
  city: Joi.string().min(2).max(50).required(),
  date: Joi.date().min('now').required(),
  type: Joi.string().valid('paid', 'tfp', 'collaboration').optional(),
  price: Joi.number().min(0).optional(),
  maxAssigned: Joi.number().min(1).optional(),
});

export const addCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
});

export const applySchema = Joi.object({
  message: Joi.string().max(500).optional(),
});
