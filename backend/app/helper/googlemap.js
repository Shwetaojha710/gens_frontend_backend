// backend/controller/google.controller.js
const axios = require('axios');

exports.snapToRoads = async (req, res) => {
  try {
    const { points } = req.body;

    if (!Array.isArray(points) || points.length < 2) {
      return res.json([]);
    }

    // ⚠️ Google Roads API max 100 points
    const slicedPoints = points.slice(0, 100);

    const path = slicedPoints
      .map(p => `${p.latitude},${p.longitude}`)
      .join('|');

    const url = `https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=true&key=${process.env.GOOGLE_MAPS_KEY}`;

    const response = await axios.get(url);

    // ✅ axios response data
    const data = response.data;

    const snappedPoints = (data.snappedPoints || []).map(p => ({
      latitude: p.location.latitude,
      longitude: p.location.longitude
    }));

    console.log('Google Roads raw:', data);
    console.log('Snapped points:', snappedPoints);

    res.json(snappedPoints);
  } catch (err) {
    console.error(
      'SnapToRoads error:',
      err.response?.data || err.message
    );
    res.status(500).json({ message: 'Snap to roads failed' });
  }
};
