import { Country, City } from 'country-state-city';
import createHttpError from 'http-errors';

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

export const getCitiesByCountryController = async (req, res) => {
  const { countryCode } = req.params;
  const { search } = req.query;

  if (!countryCode) {
    throw createHttpError(400, 'Не вказано код країни');
  }

  let cities = City.getCitiesOfCountry(countryCode)
    ?.map((city) => ({ name: city.name, stateCode: city.stateCode }))
    .filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (search) {
    const lower = search.toLowerCase();
    cities = cities.filter((city) => city.name.toLowerCase().includes(lower));
  }

  res.json({
    status: 200,
    message: `Список міст для країни ${countryCode} отримано успішно`,
    data: cities,
  });
};
