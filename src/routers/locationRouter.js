import { Router } from 'express';
import ctrlWrapper from '../utils/ctrlWrapper.js';
import * as locationController from '../controllers/locationController.js';

const locationRouter = Router();

// 📍 Список всех стран
locationRouter.get(
  '/countries',
  ctrlWrapper(locationController.getAllCountriesController),
);

// 🏙️ Список городов по коду страны
locationRouter.get(
  '/cities/:countryCode',
  ctrlWrapper(locationController.getCitiesByCountryController),
);

export default locationRouter;
