// Entfernungsberechnung über OpenStreetMap (Nominatim + OSRM)
// Kostenlose APIs, keine API-Keys erforderlich

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';

// Adresse zu Koordinaten (Geocoding)
export const geocodeAddress = async (address) => {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodedAddress}&countrycodes=de&limit=5`,
      {
        headers: {
          'User-Agent': 'TravelCostAssist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding fehlgeschlagen: ${response.status}`);
    }

    const results = await response.json();

    if (results.length === 0) {
      return { success: false, error: 'Adresse nicht gefunden' };
    }

    return {
      success: true,
      results: results.map((r) => ({
        displayName: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        type: r.type,
      })),
    };
  } catch (error) {
    console.error('Geocoding Fehler:', error);
    return { success: false, error: error.message };
  }
};

// Entfernung zwischen zwei Koordinaten berechnen (OSRM Routing)
export const calculateDistance = async (startLat, startLon, endLat, endLon) => {
  try {
    const response = await fetch(
      `${OSRM_BASE}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false`,
      {
        headers: {
          'User-Agent': 'TravelCostAssist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Routenberechnung fehlgeschlagen: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return { success: false, error: 'Keine Route gefunden' };
    }

    const route = data.routes[0];
    const distanceKm = route.distance / 1000;
    const durationMinutes = route.duration / 60;

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
