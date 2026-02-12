// Entfernungsberechnung über Google Maps APIs
// Benötigt: Geocoding API, Directions API aktiviert in Google Cloud Console

import MAP_CONFIG from '../config/mapConfig';

const GOOGLE_BASE = 'https://maps.googleapis.com/maps/api';

const getApiKey = () => {
  const key = MAP_CONFIG.GOOGLE_MAPS_API_KEY;
  if (!key || key === 'DEIN_API_KEY_HIER') {
    throw new Error(
      'Google Maps API-Key nicht konfiguriert. Bitte in src/config/mapConfig.js eintragen.'
    );
  }
  return key;
};

// Adresse zu Koordinaten (Google Geocoding API)
export const geocodeAddress = async (address) => {
  try {
    const apiKey = getApiKey();
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `${GOOGLE_BASE}/geocode/json?address=${encodedAddress}&language=de&region=de&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding fehlgeschlagen: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
      return { success: false, error: 'Adresse nicht gefunden' };
    }

    if (data.status === 'REQUEST_DENIED') {
      return { success: false, error: 'API-Key ungültig oder Geocoding API nicht aktiviert.' };
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      return { success: false, error: 'API-Kontingent überschritten.' };
    }

    if (data.status !== 'OK') {
      return { success: false, error: `Google Maps Fehler: ${data.status}` };
    }

    return {
      success: true,
      results: data.results.map((r) => ({
        displayName: r.formatted_address,
        lat: r.geometry.location.lat,
        lon: r.geometry.location.lng,
        type: r.types?.[0] || 'address',
        placeId: r.place_id,
      })),
    };
  } catch (error) {
    console.error('Geocoding Fehler:', error);
    return { success: false, error: error.message };
  }
};

// Entfernung zwischen zwei Koordinaten berechnen (Google Directions API)
export const calculateDistance = async (startLat, startLon, endLat, endLon) => {
  try {
    const apiKey = getApiKey();
    const response = await fetch(
      `${GOOGLE_BASE}/directions/json?origin=${startLat},${startLon}&destination=${endLat},${endLon}&mode=driving&language=de&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Routenberechnung fehlgeschlagen: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'ZERO_RESULTS' || !data.routes || data.routes.length === 0) {
      return { success: false, error: 'Keine Route gefunden' };
    }

    if (data.status === 'REQUEST_DENIED') {
      return { success: false, error: 'API-Key ungültig oder Directions API nicht aktiviert.' };
    }

    if (data.status !== 'OK') {
      return { success: false, error: `Google Maps Fehler: ${data.status}` };
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const distanceKm = leg.distance.value / 1000;
    const durationMinutes = leg.duration.value / 60;

    return {
      success: true,
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMinutes: Math.round(durationMinutes),
      distanceText: `${Math.round(distanceKm * 10) / 10} km`,
      durationText: formatDuration(durationMinutes),
    };
  } catch (error) {
    console.error('Routenberechnung Fehler:', error);
    return { success: false, error: error.message };
  }
};

// Kompletter Workflow: Adressen -> Entfernung
export const calculateDistanceBetweenAddresses = async (startAddress, endAddress) => {
  // Geocode start
  const startResult = await geocodeAddress(startAddress);
  if (!startResult.success) {
    return { success: false, error: `Startadresse: ${startResult.error}` };
  }

  // Geocode end
  const endResult = await geocodeAddress(endAddress);
  if (!endResult.success) {
    return { success: false, error: `Zieladresse: ${endResult.error}` };
  }

  const start = startResult.results[0];
  const end = endResult.results[0];

  // Calculate route
  const distanceResult = await calculateDistance(start.lat, start.lon, end.lat, end.lon);

  if (!distanceResult.success) {
    return distanceResult;
  }

  return {
    success: true,
    start: {
      address: start.displayName,
      lat: start.lat,
      lon: start.lon,
    },
    end: {
      address: end.displayName,
      lat: end.lat,
      lon: end.lon,
    },
    distanceKm: distanceResult.distanceKm,
    durationMinutes: distanceResult.durationMinutes,
    distanceText: distanceResult.distanceText,
    durationText: distanceResult.durationText,
  };
};

// Kilometerkosten berechnen (aktueller Satz: 0,30 €/km)
export const KILOMETER_RATE = 0.30;

export const calculateMileageCost = (distanceKm, rate = KILOMETER_RATE) => {
  return Math.round(distanceKm * rate * 100) / 100;
};

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} Min.`;
  if (mins === 0) return `${hours} Std.`;
  return `${hours} Std. ${mins} Min.`;
};

export default {
  geocodeAddress,
  calculateDistance,
  calculateDistanceBetweenAddresses,
  calculateMileageCost,
  KILOMETER_RATE,
};
