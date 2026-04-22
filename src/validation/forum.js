import Joi from 'joi';

export const createTopicSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  body: Joi.string().trim().allow('').max(5000),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(10).default([]),
  category: Joi.string().trim().max(50).allow(''),
});

export const updateTopicSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  body: Joi.string().trim().allow('').max(5000),
  tags: Joi.array().items(Joi.string().trim().max(30)).max(10),
  category: Joi.string().trim().max(50).allow(''),
}).min(1);

export const moderateTopicSchema = Joi.object({
  pinned: Joi.boolean(),
  closed: Joi.boolean(),
}).min(1);
