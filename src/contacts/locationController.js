import { Country, City } from 'country-state-city';
import createHttpError from 'http-errors';

// 📍 Получить список всех стран
export const getAllCountriesController = async (req, res) => {
  const countries = Country.getAllCountries().map((country) => ({
    name: country.name,
    isoCode: country.isoCode,
  }));

  res.json({
    status: 200,
    message: 'Список країн отримано успішно',
    data: countries,
  });
};

// 🏙️ Получить список городов по стране
export const getCitiesByCountryController = async (req, res) => {
  const { countryCode } = req.params;

  if (!countryCode) {
    throw createHttpError(400, 'Не вказано код країни');
  }

  const cities = City.getCitiesOfCountry(countryCode)?.map((city) => ({
    name: city.name,
    stateCode: city.stateCode,
  }));

  res.json({
    status: 200,
    message: `Список міст для країни ${countryCode} отримано успішно`,
    data: cities,
  });
};
