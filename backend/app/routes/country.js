const express = require('express');
const router = express.Router();
const {Admin} = require('../middleware/auth');
const { getCountries, getCountryDD } = require('../controller/tenant/country');
const { getCity, getCityDD } = require('../controller/tenant/city');
const { getState, getStateDD } = require('../controller/tenant/state');

router.post('/getCountry', Admin, getCountries); 
router.post('/getCity', Admin, getCity);
router.post('/getState', Admin, getState);

// dropdown for country, state, city
router.post('/getCountryDD', getCountryDD);
router.post('/getStateDD', Admin, getStateDD);
router.post('/getCityDD', Admin, getCityDD)

module.exports= router;