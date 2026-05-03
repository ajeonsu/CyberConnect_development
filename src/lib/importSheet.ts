import * as XLSX from 'xlsx';

/**
 * Parse an XLSX worksheet into header names and row objects without losing columns.
 * Default `sheet_to_json` drops duplicate header keys (same Excel column name twice)
 * and can mis-handle sparse trailing columns — both break batch import mapping.
 */
export function parseWorksheetForImport(worksheet: XLSX.WorkSheet): {
  columns: string[];
  rows: Record<string, unknown>[];
} {
  const aoa = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as unknown[][];

  if (!aoa.length) {
    return { columns: [], rows: [] };
  }

  const widths = aoa.map((r) => (Array.isArray(r) ? r.length : 0));
  const width = Math.max(0, ...widths);
  if (width === 0) {
    return { columns: [], rows: [] };
  }

  const headerCells = padRow(aoa[0] ?? [], width);
  const uniqueHeaders = makeUniqueHeaders(headerCells);

  const rows: Record<string, unknown>[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const raw = aoa[r];
    if (!Array.isArray(raw) && raw === undefined) continue;
    const cells = padRow(Array.isArray(raw) ? raw : [], width);
    const isEmpty = cells.every((c) => normalizeCell(c) === '');
    if (isEmpty) continue;

    const row: Record<string, unknown> = {};
    for (let c = 0; c < width; c++) {
      row[uniqueHeaders[c]] = cells[c];
    }
    rows.push(row);
  }

  return { columns: uniqueHeaders, rows };
}

function padRow(row: unknown[], width: number): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < width; i++) {
    out.push(i < row.length ? row[i] : '');
  }
  return out;
}

function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/** Strip BOM from first header when present. */
function stripBom(s: string): string {
  return s.replace(/^\ufeff/, '');
}

function makeUniqueHeaders(headerCells: unknown[]): string[] {
  const counts = new Map<string, number>();
  return headerCells.map((cell, i) => {
    let base = normalizeCell(cell);
    base = i === 0 ? stripBom(base) : base;
    if (!base) base = `Column ${i + 1}`;
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}
