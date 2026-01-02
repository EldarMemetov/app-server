import Joi from 'joi';

export const addCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
  parentComment: Joi.string().hex().length(24).optional().allow(null),
  replyTo: Joi.string().hex().length(24).optional().allow(null),
});

export const updateCommentSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
});
