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
  SUBMITTED: 'eingereicht',
  APPROVED: 'genehmigt',
  REJECTED: 'abgelehnt',
};

export const TRIP_STATUS_LABELS = {
  [TRIP_STATUS.DRAFT]: 'Entwurf',
  [TRIP_STATUS.SUBMITTED]: 'Eingereicht',
  [TRIP_STATUS.APPROVED]: 'Genehmigt',
  [TRIP_STATUS.REJECTED]: 'Abgelehnt',
};

export const TRIP_STATUS_COLORS = {
  [TRIP_STATUS.DRAFT]: '#9E9E9E',
  [TRIP_STATUS.SUBMITTED]: '#1565C0',
  [TRIP_STATUS.APPROVED]: '#2E7D32',
  [TRIP_STATUS.REJECTED]: '#D32F2F',
};

export default EXPENSE_CATEGORIES;
