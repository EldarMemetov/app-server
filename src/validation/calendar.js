import Joi from 'joi';

export const createEventSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  date: Joi.date().required(),
  participants: Joi.array().items(Joi.string().hex().length(24)).optional(),
});
