import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getCategoryLabel } from './categories';
import { getVatRateById } from './vatRates';

// ==========================================
// Data Preparation
// ==========================================

const buildReportData = (trips, allExpenses) => {
  let grandTotalGross = 0;
  let grandTotalNet = 0;
  let grandTotalVat = 0;
  let grandTotalMealAllowances = 0;

  const vatSummary = {
    vat_0: { gross: 0, net: 0, vat: 0 },
    vat_7: { gross: 0, net: 0, vat: 0 },
    vat_19: { gross: 0, net: 0, vat: 0 },
  };

  const tripReports = trips.map((trip) => {
    const tripExpenses = allExpenses
      .filter((e) => e.tripId === trip.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const tripGross = tripExpenses.reduce(
      (sum, e) => sum + (parseFloat(e.grossAmount || e.amount) || 0),
      0
    );
    const tripNet = tripExpenses.reduce(
      (sum, e) =>
        sum +
        (parseFloat(e.netAmount) ||
          parseFloat(e.grossAmount || e.amount) ||
          0),
      0
    );
    const tripVat = tripExpenses.reduce(
      (sum, e) => sum + (parseFloat(e.vatAmount) || 0),
      0
    );
    const mealAllowanceTotal = trip.mealAllowances
      ? trip.mealAllowances.totalAmount
      : 0;

    tripExpenses.forEach((e) => {
      const rateId = e.vatRateId || 'vat_19';
      const gross = parseFloat(e.grossAmount || e.amount) || 0;
      const net = parseFloat(e.netAmount) || gross;
      const vat = parseFloat(e.vatAmount) || 0;
      if (vatSummary[rateId]) {
        vatSummary[rateId].gross += gross;
        vatSummary[rateId].net += net;
        vatSummary[rateId].vat += vat;
      }
    });

    grandTotalGross += tripGross;
    grandTotalNet += tripNet;
    grandTotalVat += tripVat;
    grandTotalMealAllowances += mealAllowanceTotal;

    return {
      trip,
      expenses: tripExpenses,
      tripGross,
      tripNet,
      tripVat,
      mealAllowanceTotal,
      tripTotal: tripGross + mealAllowanceTotal,
    };
  });

  return {
    tripReports,
    vatSummary,
    grandTotalGross,
    grandTotalNet,
    grandTotalVat,
    grandTotalMealAllowances,
    grandTotal: grandTotalGross + grandTotalMealAllowances,
  };
};

// ==========================================
// Receipt Image Loading
// ==========================================

const imageToBase64DataUri = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const loadReceiptImages = async (expenses) => {
  const receiptMap = {};

  for (const expense of expenses) {
    // Firebase Storage URLs oder lokale URIs
    const uris = expense.receiptUrls || expense.receiptUris || (expense.receiptUri ? [expense.receiptUri] : []);
    if (uris.length === 0) continue;

    const images = [];
    for (const uri of uris) {
      try {
        const dataUri = await imageToBase64DataUri(uri);
        images.push(dataUri);
      } catch (err) {
        console.warn('Could not load receipt image:', uri, err.message);
      }
    }

    if (images.length > 0) {
      receiptMap[expense.id] = images;
    }
  }

  return receiptMap;
};

// ==========================================
// HTML Template
// ==========================================

const formatCurrency = (amount) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

const formatDate = (dateStr) =>
  format(new Date(dateStr), 'dd.MM.yyyy', { locale: de });

const formatDateTime = (dateStr) =>
  format(new Date(dateStr), 'dd.MM.yyyy HH:mm', { locale: de });

const escapeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const generateHTML = (reportData, userProfile, startDate, endDate, receiptMap = {}) => {
  const p = userProfile || {};

  const tripSections = reportData.tripReports
    .map((tr, idx) => {
      const expenseRows = tr.expenses
        .map((e) => {
          const vatRate = getVatRateById(e.vatRateId);
          const desc = escapeHtml(e.description) || '&ndash;';
          const kmInfo =
            e.category === 'kilometer' && e.distanceKm
              ? ` (${e.distanceKm} km)`
              : '';
          const plateInfo = e.licensePlate
            ? ` [${escapeHtml(e.licensePlate)}]`
            : '';
          return `<tr>
          <td>${formatDate(e.date)}</td>
          <td>${escapeHtml(getCategoryLabel(e.category))}</td>
          <td>${desc}${kmInfo}${plateInfo}</td>
          <td style="text-align:center">${vatRate.rate}%</td>
          <td class="r">${formatCurrency(parseFloat(e.netAmount) || 0)}</td>
          <td class="r">${formatCurrency(parseFloat(e.vatAmount) || 0)}</td>
          <td class="r">${formatCurrency(parseFloat(e.grossAmount || e.amount) || 0)}</td>
        </tr>`;
        })
        .join('');

      const mealRows =
        tr.trip.mealAllowances && tr.trip.mealAllowances.breakdown.length > 0
          ? tr.trip.mealAllowances.breakdown
              .map(
                (day) => `<tr>
          <td>${formatDate(day.date)}</td>
          <td>${escapeHtml(day.label)}</td>
          <td class="r">${formatCurrency(day.amount)}</td>
        </tr>`
              )
              .join('')
          : '';

      return `
    <div class="trip">
      <div class="trip-head">
        <div class="trip-name">${idx + 1}. ${escapeHtml(tr.trip.name)}</div>
        <div class="trip-meta">
          ${tr.trip.destination ? escapeHtml(tr.trip.destination) + ' &middot; ' : ''}${formatDateTime(tr.trip.startDateTime)} &ndash; ${formatDateTime(tr.trip.endDateTime)}
        </div>
      </div>

      ${
        tr.expenses.length > 0
          ? `<table>
        <thead><tr>
          <th style="width:12%">Datum</th>
          <th style="width:14%">Kategorie</th>
          <th>Beschreibung</th>
          <th style="width:8%;text-align:center">USt</th>
          <th class="r" style="width:13%">Netto</th>
          <th class="r" style="width:13%">USt-Betrag</th>
          <th class="r" style="width:13%">Brutto</th>
        </tr></thead>
        <tbody>
          ${expenseRows}
          <tr class="sub"><td colspan="4"><strong>Zwischensumme Ausgaben</strong></td>
            <td class="r"><strong>${formatCurrency(tr.tripNet)}</strong></td>
            <td class="r"><strong>${formatCurrency(tr.tripVat)}</strong></td>
            <td class="r"><strong>${formatCurrency(tr.tripGross)}</strong></td>
          </tr>
        </tbody>
      </table>`
          : '<p class="muted">Keine Ausgaben erfasst.</p>'
      }

      ${
        mealRows
          ? `<div class="meal-title">Verpflegungspauschalen</div>
      <table>
        <thead><tr><th>Datum</th><th>Art</th><th class="r">Betrag</th></tr></thead>
        <tbody>
          ${mealRows}
          <tr class="sub"><td colspan="2"><strong>Summe Pauschalen</strong></td>
            <td class="r"><strong>${formatCurrency(tr.mealAllowanceTotal)}</strong></td>
          </tr>
        </tbody>
      </table>`
          : ''
      }

      <div class="trip-total">Gesamtbetrag dieser Reise: <strong>${formatCurrency(tr.tripTotal)}</strong></div>

      ${(() => {
        let receiptCounter = 0;
        const receiptItems = tr.expenses
          .map((e) => {
            const images = receiptMap[e.id];
            if (!images || images.length === 0) return '';
            return images.map((dataUri, imgIdx) => {
              receiptCounter++;
              const belegNr = `Beleg Nr. ${receiptCounter}`;
              const suffix = images.length > 1 ? String.fromCharCode(97 + imgIdx) : '';
              return `<div class="receipt-item">
                <div class="receipt-label">${belegNr}${suffix}: ${escapeHtml(getCategoryLabel(e.category))} &ndash; ${formatDate(e.date)}${e.description ? ' &ndash; ' + escapeHtml(e.description) : ''}</div>
                <img src="${dataUri}" class="receipt-img" />
                <div class="receipt-caption">${belegNr}${suffix} &ndash; ${escapeHtml(getCategoryLabel(e.category))}, ${formatDate(e.date)}</div>
              </div>`;
            }).join('');
          })
          .join('');
        return receiptItems
          ? `<div class="receipts-section">
              <div class="receipts-title">Belege zu Reise: ${escapeHtml(tr.trip.name)}</div>
              ${receiptItems}
            </div>`
          : '';
      })()}
    </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:9pt;color:#212121;line-height:1.45;padding:18mm 14mm 18mm 14mm}
.r{text-align:right}

/* HEADER */
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:16px}
.header-left .company{font-size:15pt;font-weight:700;color:#212121}
.header-left .title{font-size:12pt;font-weight:600;color:#333;margin-top:2px}
.header-right{text-align:right;font-size:8.5pt;color:#555;max-width:50%}
.header-right strong{color:#212121;display:block;font-size:10pt;margin-bottom:2px}

/* PERIOD */
.period{border:1px solid #CCC;padding:7px 12px;border-radius:4px;margin-bottom:18px;font-size:9.5pt}
.period strong{color:#212121}

/* TRIP SECTIONS */
.trip{margin-bottom:20px}
.trip-head{border-left:3px solid #333;padding:7px 11px;margin-bottom:6px}
.trip-name{font-size:11pt;font-weight:700;color:#212121}
.trip-meta{font-size:8.5pt;color:#666;margin-top:2px}
.trip-total{border-top:1px solid #CCC;padding:6px 11px;font-size:10pt;text-align:right;margin-top:4px}
.trip-total strong{color:#212121}

/* TABLES */
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5pt}
th{background:#F5F5F5;color:#212121;padding:5px 7px;text-align:left;font-weight:600;font-size:7.5pt;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #333}
th.r{text-align:right}
td{padding:4px 7px;border-bottom:1px solid #E0E0E0}
tr:nth-child(even){background:#FAFAFA}
.sub td{border-top:2px solid #333;border-bottom:none;padding-top:6px}
.muted{color:#999;font-style:italic;margin:4px 0 8px}
.meal-title{font-size:9.5pt;font-weight:600;color:#212121;margin:8px 0 4px}

/* SUMMARY */
.section-title{font-size:10.5pt;font-weight:700;color:#212121;border-bottom:1px solid #333;padding-bottom:3px;margin:20px 0 8px}
.summary-table td{padding:5px 7px;font-size:9.5pt}
.grand td{font-size:11pt;font-weight:700;color:#212121;border-top:3px double #333;padding-top:8px}

/* RECEIPTS */
.receipts-section{page-break-before:always;margin-top:0;padding-top:10px}
.receipts-title{font-size:10.5pt;font-weight:700;color:#212121;margin-bottom:8px;border-bottom:1px solid #333;padding-bottom:3px}
.receipt-item{margin-bottom:16px;page-break-inside:avoid;text-align:center}
.receipt-label{font-size:8pt;color:#555;font-weight:600;margin-bottom:4px}
.receipt-img{max-width:100%;max-height:500px;border:1px solid #E0E0E0;border-radius:3px;display:block;margin:0 auto}
.receipt-caption{font-size:8pt;color:#333;font-weight:600;text-align:center;margin-top:4px;padding:3px 0;border-bottom:1px solid #E0E0E0}

/* FOOTER */
.footer{margin-top:36px;padding-top:12px;border-top:1px solid #E0E0E0}
.sig-row{display:flex;justify-content:space-between;margin-top:36px}
.sig-block{width:44%;text-align:center}
.sig-line{border-top:1px solid #212121;margin-top:36px;padding-top:4px;font-size:8.5pt;color:#666}
.gen-note{font-size:7.5pt;color:#999;text-align:center;margin-top:16px}
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="company">${escapeHtml(p.companyName) || 'TravelCostAssist'}</div>
    <div class="title">Reisekostenabrechnung</div>
    ${p.companyStreet ? `<div style="font-size:8.5pt;color:#555;margin-top:4px">${escapeHtml(p.companyStreet)}<br>${escapeHtml(p.companyZipCity)}</div>` : ''}
    ${p.companyTaxId ? `<div style="font-size:8pt;color:#888;margin-top:2px">USt-IdNr.: ${escapeHtml(p.companyTaxId)}</div>` : ''}
  </div>
  <div class="header-right">
    <strong>${escapeHtml(p.name) || 'N/A'}</strong>
    ${p.employeeId ? 'Personalnr.: ' + escapeHtml(p.employeeId) + '<br>' : ''}
    ${p.department ? 'Abteilung: ' + escapeHtml(p.department) + '<br>' : ''}
    ${p.costCenter ? 'Kostenstelle: ' + escapeHtml(p.costCenter) + '<br>' : ''}
    ${p.email ? escapeHtml(p.email) + '<br>' : ''}
    ${p.iban ? 'IBAN: ' + escapeHtml(p.iban) : ''}
  </div>
</div>

<div class="period">
  <strong>Abrechnungszeitraum:</strong>
  ${format(startDate, 'dd.MM.yyyy', { locale: de })} &ndash; ${format(endDate, 'dd.MM.yyyy', { locale: de })}
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <strong>${reportData.tripReports.length}</strong> ${reportData.tripReports.length === 1 ? 'Dienstreise' : 'Dienstreisen'}
</div>

${tripSections}

<div class="section-title">Umsatzsteuer-\u00DCbersicht</div>
<table>
  <thead><tr>
    <th>USt-Satz</th><th class="r">Nettobetrag</th><th class="r">USt-Betrag</th><th class="r">Bruttobetrag</th>
  </tr></thead>
  <tbody>
    <tr><td>0% (steuerfrei)</td><td class="r">${formatCurrency(reportData.vatSummary.vat_0.net)}</td><td class="r">${formatCurrency(reportData.vatSummary.vat_0.vat)}</td><td class="r">${formatCurrency(reportData.vatSummary.vat_0.gross)}</td></tr>
    <tr><td>7% (erm\u00E4\u00DFigt)</td><td class="r">${formatCurrency(reportData.vatSummary.vat_7.net)}</td><td class="r">${formatCurrency(reportData.vatSummary.vat_7.vat)}</td><td class="r">${formatCurrency(reportData.vatSummary.vat_7.gross)}</td></tr>
    <tr><td>19% (regul\u00E4r)</td><td class="r">${formatCurrency(reportData.vatSummary.vat_19.net)}</td><td class="r">${formatCurrency(reportData.vatSummary.vat_19.vat)}</td><td class="r">${formatCurrency(reportData.vatSummary.vat_19.gross)}</td></tr>
    <tr class="sub"><td><strong>Gesamt</strong></td><td class="r"><strong>${formatCurrency(reportData.grandTotalNet)}</strong></td><td class="r"><strong>${formatCurrency(reportData.grandTotalVat)}</strong></td><td class="r"><strong>${formatCurrency(reportData.grandTotalGross)}</strong></td></tr>
  </tbody>
</table>

<div class="section-title">Gesamt\u00FCbersicht</div>
<table class="summary-table">
  <tr><td>Ausgaben gesamt (brutto)</td><td class="r">${formatCurrency(reportData.grandTotalGross)}</td></tr>
  <tr><td>Verpflegungspauschalen gesamt</td><td class="r">${formatCurrency(reportData.grandTotalMealAllowances)}</td></tr>
  <tr class="grand"><td>Erstattungsbetrag gesamt</td><td class="r">${formatCurrency(reportData.grandTotal)}</td></tr>
</table>

<div class="footer">
  <div class="sig-row">
    <div class="sig-block"><div class="sig-line">Datum, Unterschrift Reisende/r</div></div>
    <div class="sig-block"><div class="sig-line">Datum, Unterschrift Vorgesetzte/r</div></div>
  </div>
  <div class="gen-note">Erstellt mit TravelCostAssist am ${format(new Date(), 'dd.MM.yyyy', { locale: de })} um ${format(new Date(), 'HH:mm', { locale: de })} Uhr</div>
</div>

</body>
</html>`;
};

// ==========================================
// PDF Generation & Sharing
// ==========================================

const generateFileName = (userProfile, startDate, endDate) => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yy}${mm}${dd}`;

  const name = (userProfile && userProfile.name)
    ? userProfile.name.replace(/[^a-zA-ZäöüÄÖÜß\s-]/g, '').trim().replace(/\s+/g, '_')
    : 'Mitarbeiter';

  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const startMonth = monthNames[startDate.getMonth()];
  const endMonth = monthNames[endDate.getMonth()];
  const year = endDate.getFullYear();

  const period = startMonth === endMonth
    ? `${startMonth}-${year}`
    : `${startMonth}-${endMonth}_${year}`;

  return `${datePrefix}_RK_Abrechnung_${name}_${period}.pdf`;
};

export const generateReportPDF = async ({
  trips,
  expenses,
  userProfile,
  startDate,
  endDate,
}) => {
  const reportData = buildReportData(trips, expenses);

  // Load receipt images for all relevant expenses
  const relevantExpenses = expenses.filter((e) =>
    trips.some((t) => t.id === e.tripId)
  );
  const receiptMap = await loadReceiptImages(relevantExpenses);

  const html = generateHTML(reportData, userProfile, startDate, endDate, receiptMap);

  const fileName = generateFileName(userProfile, startDate, endDate);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: fileName.replace('.pdf', ''),
    UTI: 'com.adobe.pdf',
  });

  return { uri, reportData };
};

export { buildReportData };
