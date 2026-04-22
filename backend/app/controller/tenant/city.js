const City = require('../../models/city');
const Helper = require('../../helper/helper');

exports.getCity = async (req, res) => {
    try {
        const cities = await City.findAll();
    
        if (cities.length === 0) {
        return Helper.response(false, 'No cities found', [], res, 404);
        }
    
        const formattedCities = cities.map(city => ({
        ...city.toJSON()
        }));
    
        return Helper.response(true, 'Cities fetched successfully', formattedCities, res, 200);
    } catch (error) {
        console.error('Error fetching cities:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
}

exports.getCityDD = async (req, res) => {
    try {
        const cities = await City.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });
    
        if (cities.length === 0) {
            return Helper.response(false, 'No cities found', [], res, 404);
        }
    
        const formattedCities = cities.map(city => ({
            value: city.id,
            label: city.name
        }));
    
        return Helper.response(true, 'Cities dropdown fetched successfully', formattedCities, res, 200);
    } catch (error) {
        console.error('Error fetching cities dropdown:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
}