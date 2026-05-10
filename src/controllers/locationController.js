import { Country, City } from 'country-state-city';
import createHttpError from 'http-errors';

const citiesCache = new Map();

export const getAllCountriesController = async (req, res) => {
  const countries = Country.getAllCountries().map((country) => ({
    name: country.name,
    isoCode: country.isoCode,
    flag: country.flag,
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

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw createHttpError(400, 'Невірний формат коду країни');
  }

  if (!citiesCache.has(countryCode)) {
    const raw = City.getCitiesOfCountry(countryCode) ?? [];

    const seen = new Set();
    const cleaned = raw
      .filter((city) => {
        if (city.name.length < 2) return false;
        if (/\d/.test(city.name)) return false;
        if (
          /^(ward|district|sector|block|village|tehsil|taluk|union|rural|sub-district)/i.test(
            city.name,
          )
        )
          return false;

        const key = city.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((city) => ({ name: city.name.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));

    citiesCache.set(countryCode, cleaned);
  }

  let cities = citiesCache.get(countryCode);

  if (search) {
    const lower = search.toLowerCase();
    cities = cities.filter((c) => c.name.toLowerCase().startsWith(lower));
  }

  res.json({
    status: 200,
    message: `Список міст для країни ${countryCode} отримано успішно`,
    data: cities,
  });
};
