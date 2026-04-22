const State = require('../../models/state');
const Helper = require('../../helper/helper');

exports.getState = async (req, res) => {
    try {
        const states = await State.findAll();

        if (states.length === 0) {
            return Helper.response(false, 'No states found', [], res, 404);
        }

        const formattedStates = states.map(state => ({
            ...state.toJSON()
        }));

        return Helper.response(true, 'States fetched successfully', formattedStates, res, 200);
    } catch (error) {
        console.error('Error fetching states:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
}

exports.getStateDD = async (req, res) => {
    try {
        const states = await State.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });

        if (states.length === 0) {
            return Helper.response(false, 'No states found', [], res, 404);
        }

        const formattedStates = states.map(state => ({
            value: state.id,
            label: state.name
        }));

        return Helper.response(true, 'States dropdown fetched successfully', formattedStates, res, 200);
    } catch (error) {
        console.error('Error fetching states dropdown:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
}