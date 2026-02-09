// Deutsche Umsatzsteuersätze
const VAT_RATES = [
  { id: 'vat_0', rate: 0, label: '0% (steuerfrei)', description: 'Steuerfreie Leistungen' },
  { id: 'vat_7', rate: 7, label: '7% (ermäßigt)', description: 'Ermäßigter Steuersatz (z.B. ÖPNV, Bücher)' },
  { id: 'vat_19', rate: 19, label: '19% (regulär)', description: 'Regulärer Steuersatz' },
];

export const getVatRateById = (id) => {
  return VAT_RATES.find((v) => v.id === id) || VAT_RATES[2];
};

export const calculateNetAmount = (grossAmount, vatRateId) => {
  const vat = getVatRateById(vatRateId);
  return grossAmount / (1 + vat.rate / 100);
};

export const calculateVatAmount = (grossAmount, vatRateId) => {
  const netAmount = calculateNetAmount(grossAmount, vatRateId);
  return grossAmount - netAmount;
};

export default VAT_RATES;
