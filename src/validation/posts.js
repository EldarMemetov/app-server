import Joi from 'joi';

export const createPostSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(2000).required(),
  photo: Joi.string().uri().optional(),
  roleNeeded: Joi.array().items(Joi.string()).optional(),
  city: Joi.string().required(),
  date: Joi.date().optional(),
  type: Joi.string().valid('paid', 'tfp', 'collaboration').optional(),
});
export const addCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
});

export const applySchema = Joi.object({
  message: Joi.string().max(500).optional(),
});
