import Joi from 'joi';

export const registerUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  surname: Joi.string().min(2).max(50).required(),
  city: Joi.string().min(2).max(50).required(),
  photo: Joi.string().uri().required(),
  email: Joi.string().email().required(),
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

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  surname: Joi.string().min(2).max(50),
  city: Joi.string().min(2).max(50),
  photo: Joi.string().uri(),
  email: Joi.string().email(),
  role: Joi.string().valid(
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
  ),
  password: Joi.string().min(6).max(128),
}).min(1);
