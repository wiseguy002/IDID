/**
 * One CSV cell. Text that a spreadsheet would run as a formula (starting with = + - @, a tab or a carriage
 * return) gets a leading apostrophe so it shows as plain text; cells with commas, quotes or line breaks are quoted.
 */
export function csvCell(c: string): string {
  const v = /^[=+\-@\t\r]/.test(c) ? `'${c}` : c;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Rows of cells as CSV text. */
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n');
