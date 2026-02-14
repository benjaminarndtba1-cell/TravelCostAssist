// Google Maps API Konfiguration
// API-Key wird aus Umgebungsvariablen geladen (.env Datei).
// Benötigte APIs: Geocoding API, Directions API, Places API
const MAP_CONFIG = {
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
};

export default MAP_CONFIG;
