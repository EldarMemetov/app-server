import Joi from 'joi';

export const addCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
});

export const updateCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
});
