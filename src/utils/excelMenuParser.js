import * as XLSX from 'xlsx';

/**
 * Parses BiKitchen's weekly menu Excel format (.xlsx)
 * Supports Almuerzos (Col A/B), Cenas / Segundo Menú (Col C/D),
 * Desayunos, Proteínas, Pack Familiar Premium y Deluxe.
 *
 * @param {ArrayBuffer} buffer - Excel file buffer
 * @returns {Object} Parsed menu object matching EMPTY_MENUS structure
 */
export function parseBiKitchenExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Normalize rows to arrays of trimmed strings
  const rows = rawRows.map(r => r.map(c => String(c || '').trim()));

  const result = {
    desayuno: [],
    fullPack: [],
    keto: [],
    bajoCalorias: [],
    sinCarbos: [],
    regular: [],
    vegetariano: [],
    casaditos: [],
    cena: {
      fullPack: [],
      keto: [],
      bajoCalorias: [],
      sinCarbos: [],
      regular: [],
      vegetariano: [],
      casaditos: []
    },
    familiarPremium: [],
    familiarDeluxe: [],
    proteinasDisponibles: []
  };

  // Find column index containing keywords
  let colAlmuerzos = 0;
  let colCenas = 2;

  // Auto-detect columns if needed
  rows.slice(0, 10).forEach(r => {
    r.forEach((cell, cIdx) => {
      const u = cell.toUpperCase();
      if (u.includes('SEGUNDO') || u.includes('CENA')) {
        colCenas = cIdx;
      }
    });
  });

  // Helper to extract N-line dishes from a column starting at row index
  function parseDishes(colIdx, startRow, count, linesPerDish, isSinCarbo = false) {
    const dishes = [];
    let r = startRow;
    while (r < rows.length && dishes.length < count) {
      while (r < rows.length && !rows[r][colIdx]) r++;
      if (r >= rows.length) break;

      const proteina = rows[r][colIdx] || '';
      const vegetal = linesPerDish >= 2 ? (rows[r + 1]?.[colIdx] || '') : '';
      const carbo = (linesPerDish >= 3 && !isSinCarbo) ? (rows[r + 2]?.[colIdx] || '') : '';

      dishes.push({
        numero: dishes.length + 1,
        proteina,
        vegetal,
        carbo
      });

      r += linesPerDish;
      if (r < rows.length && !rows[r][colIdx]) r++;
    }
    return dishes;
  }

  // Helper to find header row in a column
  function findHeaderRow(colIdx, headerKeyword, startFrom = 0) {
    const kw = headerKeyword.toLowerCase();
    for (let r = startFrom; r < rows.length; r++) {
      const val = (rows[r][colIdx] || '').toLowerCase();
      if (val.includes(kw)) return r;
    }
    return -1;
  }

  // --- PARSE ALMUERZOS (colAlmuerzos) ---
  const rSinCarbo = findHeaderRow(colAlmuerzos, 'sin carbos', 0);
  if (rSinCarbo !== -1) {
    result.sinCarbos = parseDishes(colAlmuerzos, rSinCarbo + 1, 5, 2, true);
  }

  const rBajoCal = findHeaderRow(colAlmuerzos, 'bajo en calorias', 0);
  if (rBajoCal !== -1) {
    result.bajoCalorias = parseDishes(colAlmuerzos, rBajoCal + 1, 5, 3);
  }

  const rRegular = findHeaderRow(colAlmuerzos, 'menu regular', 0);
  if (rRegular !== -1) {
    result.regular = parseDishes(colAlmuerzos, rRegular + 1, 5, 3);
  }

  const rKeto = findHeaderRow(colAlmuerzos, 'menu keto', 0);
  if (rKeto !== -1) {
    result.keto = parseDishes(colAlmuerzos, rKeto + 1, 5, 2, true);
  }

  const rVeg = findHeaderRow(colAlmuerzos, 'menu vegetariano', 0);
  if (rVeg !== -1) {
    result.vegetariano = parseDishes(colAlmuerzos, rVeg + 1, 5, 3);
  }

  const rCasa = findHeaderRow(colAlmuerzos, 'casaditos', 120);
  if (rCasa !== -1) {
    result.casaditos = parseDishes(colAlmuerzos, rCasa + 1, 5, 3);
  }

  const rFull = findHeaderRow(colAlmuerzos, 'full pack', 150);
  if (rFull !== -1) {
    let startR = rFull + 1;
    if (rows[startR]?.[colAlmuerzos]?.includes('150 g')) startR++;
    result.fullPack = parseDishes(colAlmuerzos, startR, 5, 3);
  }

  // Fallback: If full pack or regular are empty, use regular / bajoCalorias
  if (!result.fullPack.length && result.regular.length) result.fullPack = result.regular;

  // --- PARSE CENAS (colCenas) ---
  const rCenaSinCarbo = findHeaderRow(colCenas, 'sin carbos', 0);
  if (rCenaSinCarbo !== -1) {
    result.cena.sinCarbos = parseDishes(colCenas, rCenaSinCarbo + 1, 5, 2, true);
  }

  const rCenaBajoCal = findHeaderRow(colCenas, 'bajo en calorias', 0);
  if (rCenaBajoCal !== -1) {
    const cenas3Lines = parseDishes(colCenas, rCenaBajoCal + 1, 5, 3);
    result.cena.bajoCalorias = cenas3Lines;
    result.cena.regular = cenas3Lines;
    result.cena.fullPack = cenas3Lines;
  }

  // Desayunos (colCenas)
  const rDesayuno = findHeaderRow(colCenas, 'desayunos', 0);
  if (rDesayuno !== -1) {
    const desayunos = [];
    for (let r = rDesayuno + 1; r < rows.length && desayunos.length < 5; r++) {
      const val = rows[r][colCenas];
      if (val && !val.toUpperCase().includes('CASADITOS')) {
        desayunos.push({
          numero: desayunos.length + 1,
          proteina: val,
          vegetal: '',
          carbo: ''
        });
      }
      if (val && val.toUpperCase().includes('CASADITOS')) break;
    }
    result.desayuno = desayunos;
  }

  const rCenaCasa = findHeaderRow(colCenas, 'casaditos', 30);
  if (rCenaCasa !== -1) {
    result.cena.casaditos = parseDishes(colCenas, rCenaCasa + 1, 5, 3);
  }

  // Cena Keto
  const rCenaKeto = findHeaderRow(colCenas, 'keto', 50);
  if (rCenaKeto !== -1) {
    result.cena.keto = parseDishes(colCenas, rCenaKeto + 1, 5, 2, true);
  } else {
    result.cena.keto = result.cena.sinCarbos.length ? result.cena.sinCarbos : result.keto;
  }

  result.cena.vegetariano = result.vegetariano;

  // --- PARSE PROTEINAS ---
  const rProt = findHeaderRow(colAlmuerzos, 'paquetes de proteina', 0);
  if (rProt !== -1) {
    const prots = [];
    for (let r = rProt + 1; r < rows.length; r++) {
      const val = rows[r][colAlmuerzos];
      if (!val) continue;
      if (val.toLowerCase().includes('pack de 3') || val.toLowerCase().includes('paquete premium')) break;
      if (val.toLowerCase().startsWith('pack 1')) continue;
      prots.push(val);
    }
    result.proteinasDisponibles = prots;
  }

  // --- PARSE PAQUETES FAMILIARES ---
  const rPrem = findHeaderRow(colAlmuerzos, 'paquete premium', 0);
  if (rPrem !== -1) {
    const items = [];
    for (let r = rPrem + 1; r < rows.length; r++) {
      const val = rows[r][colAlmuerzos];
      if (!val) continue;
      if (val.toLowerCase().includes('precio') || val.toLowerCase().includes('paquete deluxe')) break;
      items.push({ numero: items.length + 1, proteina: val, vegetal: '', carbo: '' });
    }
    result.familiarPremium = items;
  }

  const rDeluxe = findHeaderRow(colAlmuerzos, 'paquete deluxe', 0);
  if (rDeluxe !== -1) {
    const items = [];
    for (let r = rDeluxe + 1; r < rows.length; r++) {
      const val = rows[r][colAlmuerzos];
      if (!val) continue;
      if (val.toLowerCase().includes('precio') || val.toLowerCase().includes('casaditos')) break;
      items.push({ numero: items.length + 1, proteina: val, vegetal: '', carbo: '' });
    }
    result.familiarDeluxe = items;
  }

  return result;
}
