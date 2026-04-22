const Country = require("../../models/country");
const Helper = require("../../helper/helper");

exports.getCountries = async (req, res) => {
    try{
       

        const countries = await Country.findAll();

        if (countries.length === 0) {
            return Helper.response(false, "No countries found", [], res, 404);
        }

        const formattedCountries = countries.map(country => ({
            ...country.toJSON(),
        }));

        return Helper.response(true, "Countries fetched successfully", formattedCountries, res, 200);
    }
    catch(err)
    {
        console.error("Error fetching countries:", err);
        return Helper.response(false, "Internal server error", [], res, 500);
    }
}

exports.getCountryDD = async (req, res) => {
    try {
        const countries = await Country.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        if (countries.length === 0) {
            return Helper.response(false, "No countries found", [], res, 404);
        }

        const formattedCountries = countries.map(country => ({
            value: country.id,
            label: country.name
        }));

        return Helper.response(true, "Countries dropdown fetched successfully", formattedCountries, res, 200);
    } catch (error) {
        console.error("Error fetching countries dropdown:", error);
        return Helper.response(false, "Internal server error", [], res, 500);
    }
}