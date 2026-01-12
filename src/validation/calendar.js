import Joi from 'joi';

export const createEventSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  date: Joi.date().required(),
  participants: Joi.array().items(Joi.string().hex().length(24)).optional(),
});

export const updateEventSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  date: Joi.date().optional(),
  participants: Joi.array().items(Joi.string().hex().length(24)).optional(),
});
