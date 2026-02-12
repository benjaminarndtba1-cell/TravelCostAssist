const EXPENSE_CATEGORIES = [
  {
    id: 'kilometer',
    label: 'Kilometer',
    icon: 'map-marker-distance',
    color: '#1565C0',
    description: 'Gefahrene Kilometer mit eigenem PKW',
    defaultVat: 'vat_0',
  },
  {
    id: 'fahrt',
    label: 'Fahrt',
    icon: 'car',
    color: '#0D47A1',
    description: 'Taxi, Mietwagen, ÖPNV, Bahn, Flug',
    defaultVat: 'vat_7',
  },
  {
    id: 'uebernachtung',
    label: 'Übernachtung',
    icon: 'bed',
    color: '#7B1FA2',
    description: 'Hotel, Pension, Ferienwohnung',
    defaultVat: 'vat_7',
  },
  {
    id: 'verpflegung',
    label: 'Verpflegung',
    icon: 'food-fork-drink',
    color: '#E65100',
    description: 'Frühstück, Mittag, Abendessen, Snacks',
    defaultVat: 'vat_19',
  },
  {
    id: 'sonstiges',
    label: 'Sonstiges',
    icon: 'dots-horizontal-circle',
    color: '#455A64',
    description: 'Parkgebühren, Telefon, Material, etc.',
    defaultVat: 'vat_19',
  },
];

// Häufige Reisekosten-Positionen in Deutschland mit korrekten USt-Sätzen
export const EXPENSE_PRESETS = {
  kilometer: [
    { id: 'km_eigener_pkw', label: 'Kilometerpauschale eigener PKW', vatRateId: 'vat_0', icon: 'car', hasLicensePlate: true },
    { id: 'km_dienstwagen', label: 'Dienstwagen (ohne Pauschale)', vatRateId: 'vat_0', icon: 'car-estate' },
  ],
  fahrt: [
    { id: 'bahn_fern', label: 'Bahnticket (Fernverkehr)', vatRateId: 'vat_7', icon: 'train' },
    { id: 'bahn_nah', label: 'ÖPNV / Nahverkehr', vatRateId: 'vat_7', icon: 'bus' },
    { id: 'taxi', label: 'Taxi', vatRateId: 'vat_7', icon: 'taxi' },
    { id: 'mietwagen', label: 'Mietwagen', vatRateId: 'vat_19', icon: 'car-side' },
    { id: 'flug_inland', label: 'Flug (Inland)', vatRateId: 'vat_19', icon: 'airplane' },
    { id: 'flug_ausland', label: 'Flug (International)', vatRateId: 'vat_0', icon: 'airplane-takeoff' },
    { id: 'carsharing', label: 'Carsharing', vatRateId: 'vat_19', icon: 'car-connected' },
    { id: 'fahrt_sonstige', label: 'Sonstige Fahrtkosten', vatRateId: 'vat_19', icon: 'dots-horizontal' },
  ],
  uebernachtung: [
    { id: 'hotel', label: 'Hotelübernachtung', vatRateId: 'vat_7', icon: 'bed' },
    { id: 'hotel_fruehstueck', label: 'Hotelfrühstück', vatRateId: 'vat_19', icon: 'food-croissant' },
    { id: 'pension', label: 'Pension / Gästehaus', vatRateId: 'vat_7', icon: 'home-variant' },
    { id: 'ferienwohnung', label: 'Ferienwohnung', vatRateId: 'vat_7', icon: 'home-city' },
    { id: 'uebernachtung_sonstige', label: 'Sonstige Übernachtung', vatRateId: 'vat_7', icon: 'dots-horizontal' },
  ],
  verpflegung: [
    { id: 'geschaeftsessen', label: 'Geschäftsessen / Bewirtung', vatRateId: 'vat_19', icon: 'silverware-fork-knife' },
    { id: 'mittagessen', label: 'Mittagessen', vatRateId: 'vat_19', icon: 'food' },
    { id: 'abendessen', label: 'Abendessen', vatRateId: 'vat_19', icon: 'food-variant' },
    { id: 'getraenke', label: 'Getränke', vatRateId: 'vat_19', icon: 'cup' },
    { id: 'snacks', label: 'Snacks / Kleinigkeiten', vatRateId: 'vat_19', icon: 'food-apple' },
  ],
  sonstiges: [
    { id: 'parkgebuehr', label: 'Parkgebühren', vatRateId: 'vat_19', icon: 'parking' },
    { id: 'telefon', label: 'Telefon / Internet', vatRateId: 'vat_19', icon: 'cellphone' },
    { id: 'bueromaterial', label: 'Büromaterial', vatRateId: 'vat_19', icon: 'pencil-ruler' },
    { id: 'porto', label: 'Porto / Versand', vatRateId: 'vat_19', icon: 'email-outline' },
    { id: 'kopien', label: 'Kopien / Druckkosten', vatRateId: 'vat_19', icon: 'printer' },
    { id: 'trinkgeld', label: 'Trinkgeld', vatRateId: 'vat_0', icon: 'hand-coin' },
    { id: 'gepaeck', label: 'Gepäckaufbewahrung', vatRateId: 'vat_19', icon: 'bag-suitcase' },
    { id: 'eintritt', label: 'Eintritt / Konferenzgebühr', vatRateId: 'vat_19', icon: 'ticket-confirmation' },
    { id: 'sonstiges_andere', label: 'Sonstige Kosten', vatRateId: 'vat_19', icon: 'dots-horizontal' },
  ],
};

export const getPresetsForCategory = (categoryId) => {
  return EXPENSE_PRESETS[categoryId] || [];
};

export const getCategoryById = (id) => {
  return EXPENSE_CATEGORIES.find((cat) => cat.id === id) || EXPENSE_CATEGORIES[4];
};

export const getCategoryLabel = (id) => {
  const category = getCategoryById(id);
  return category ? category.label : 'Unbekannt';
};

export const getCategoryColor = (id) => {
  const category = getCategoryById(id);
  return category ? category.color : '#9E9E9E';
};

export const getCategoryIcon = (id) => {
  const category = getCategoryById(id);
  return category ? category.icon : 'help-circle';
};

export const TRIP_STATUS = {
  DRAFT: 'entwurf',
  COMPLETED: 'abgeschlossen',
  SUBMITTED: 'eingereicht',
  APPROVED: 'genehmigt',
  REJECTED: 'abgelehnt',
};

export const TRIP_STATUS_LABELS = {
  [TRIP_STATUS.DRAFT]: 'Entwurf',
  [TRIP_STATUS.COMPLETED]: 'Abgeschlossen',
  [TRIP_STATUS.SUBMITTED]: 'Eingereicht',
  [TRIP_STATUS.APPROVED]: 'Genehmigt',
  [TRIP_STATUS.REJECTED]: 'Abgelehnt',
};

export const TRIP_STATUS_COLORS = {
  [TRIP_STATUS.DRAFT]: '#9E9E9E',
  [TRIP_STATUS.COMPLETED]: '#2E7D32',
  [TRIP_STATUS.SUBMITTED]: '#1565C0',
  [TRIP_STATUS.APPROVED]: '#2E7D32',
  [TRIP_STATUS.REJECTED]: '#D32F2F',
};

export default EXPENSE_CATEGORIES;
