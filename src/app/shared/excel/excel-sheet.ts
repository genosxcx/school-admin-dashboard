import type { SheetData } from 'write-excel-file/browser';

export type ImportClass = { id: string; name: string };

/** Column name aliases per field, compared after `normalize`. Earlier aliases win ties. */
export type HeaderAliases<F extends string> = Record<F, string[]>;

export type SheetTable<F extends string> = {
  /** Column index of each field the sheet has. */
  columns: Partial<Record<F, number>>;
  /** Index of the first data row. */
  firstDataRow: number;
  /** Text above the header row, such as a class title. */
  title: string;
};

/** How many rows at the top of a sheet may be titles or notes before the header. */
const HEADER_SEARCH_ROWS = 10;

// Header names shared by every import, in English, Arabic and Hebrew.
export const NAME_ALIASES = [
  'name', 'fullname',
  'الاسم', 'اسم', 'الاسمالكامل',
  'שם', 'שםמלא',
];
export const FIRST_NAME_ALIASES = ['firstname', 'givenname', 'الاسمالأول', 'الاسمالاول', 'שםפרטי'];
export const LAST_NAME_ALIASES = ['lastname', 'surname', 'familyname', 'اسمالعائلة', 'العائلة', 'שםמשפחה'];
export const CLASS_ALIASES = ['class', 'classname', 'الصف', 'صف', 'الفصل', 'فصل', 'כיתה'];
export const EMAIL_ALIASES = [
  'email', 'mail', 'emailaddress',
  'البريد', 'البريدالإلكتروني', 'البريدالالكتروني', 'الايميل', 'الإيميل', 'ايميل', 'إيميل',
  'דואל', 'אימייל', 'מייל', 'דוארלקטרוני',
];

/** Lower-cases and drops spaces and punctuation, so "Student ID" and "ת.ז." compare loosely. */
export function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function findHeader<F extends string>(row: unknown[], aliases: HeaderAliases<F>): Partial<Record<F, number>> {
  const columns: Partial<Record<F, number>> = {};
  const rank: Partial<Record<F, number>> = {};
  const used = new Set<number>();
  for (const field of Object.keys(aliases) as F[]) {
    row.forEach((cell, index) => {
      if (used.has(index)) return;
      const r = aliases[field].indexOf(normalize(cell));
      if (r >= 0 && (rank[field] === undefined || r < rank[field]!)) {
        rank[field] = r;
        columns[field] = index;
      }
    });
    if (columns[field] !== undefined) used.add(columns[field]!);
  }
  return columns;
}

/** True when the first column holds 1, 2, 3… row numbers and the second looks like IDs. */
function hasCounterColumn(rows: unknown[][], secondColumn: RegExp): boolean {
  const counters = rows.map((r) => cellText(r[0])).filter(Boolean);
  return (
    counters.length > 1 &&
    counters.every((v, i) => v === String(i + 1)) &&
    rows.every((r) => secondColumn.test(cellText(r[1])))
  );
}

/**
 * Finds the table in a sheet: the header is the first of the top rows for which `isHeader`
 * accepts the recognised columns; anything above it becomes `title`, and columns the header
 * doesn't name, such as a "#" row counter, are ignored. Without a header, `fallback` gives the
 * column order, after a leading 1, 2, 3… counter column whose neighbour matches `counterNext`.
 */
export function locateTable<F extends string>(
  sheet: unknown[][],
  aliases: HeaderAliases<F>,
  isHeader: (columns: Partial<Record<F, number>>) => boolean,
  fallback: (width: number) => F[],
  counterNext: RegExp,
): SheetTable<F> | null {
  const start = sheet.findIndex((r) => (r ?? []).some((c) => cellText(c) !== ''));
  if (start < 0) return null;

  for (let i = start; i < Math.min(sheet.length, start + HEADER_SEARCH_ROWS); i++) {
    const columns = findHeader(sheet[i] ?? [], aliases);
    if (isHeader(columns)) {
      const title = sheet
        .slice(start, i)
        .flatMap((r) => (r ?? []).map(cellText))
        .filter((t) => normalize(t) !== '')
        .join(' ');
      return { columns, firstDataRow: i + 1, title };
    }
  }

  const data = sheet.slice(start);
  const offset = hasCounterColumn(data, counterNext) ? 1 : 0;
  const width = Math.max(...data.map((r) => (r ?? []).filter((c) => cellText(c) !== '').length)) - offset;
  const columns: Partial<Record<F, number>> = {};
  fallback(width).forEach((field, i) => (columns[field] = offset + i));
  return { columns, firstDataRow: start, title: '' };
}

/** Reads one field of a row as text, or '' when the sheet has no such column. */
export function readField<F extends string>(table: SheetTable<F>, row: unknown[], field: F): string {
  const index = table.columns[field];
  return index === undefined ? '' : cellText(row[index]);
}

type NameFields = 'fullName' | 'firstName' | 'lastName';

/** The full name, or first and last name joined when the sheet splits them. */
export function readName<F extends string>(table: SheetTable<F | NameFields>, row: unknown[]): string {
  return (
    readField(table, row, 'fullName') ||
    [readField(table, row, 'firstName'), readField(table, row, 'lastName')].filter(Boolean).join(' ')
  );
}

export function hasNameColumn(columns: Partial<Record<string, number>>): boolean {
  return columns['fullName'] !== undefined || columns['firstName'] !== undefined;
}

export function classMatcher(classes: ImportClass[]): (text: string) => ImportClass | undefined {
  const byKey = new Map<string, ImportClass>();
  for (const c of classes) {
    byKey.set(normalize(c.name), c);
    byKey.set(normalize(c.id), c);
  }
  return (text) => byKey.get(normalize(text));
}

export function matchClassByTitle(title: string, classes: ImportClass[]): string {
  const key = normalize(title);
  if (!key) return '';
  const exact = classes.find((c) => normalize(c.name) === key);
  if (exact) return exact.id;
  // Titles like "10-הייטק (רולא סוויטי)" carry the class name plus extras such as the teacher.
  const contained = classes
    .filter((c) => normalize(c.name).length > 0 && key.includes(normalize(c.name)))
    .sort((x, y) => normalize(y.name).length - normalize(x.name).length);
  return contained[0]?.id ?? '';
}

/** Builds header + rows sheet data, with a bold header row. */
export function buildSheet(headers: string[], rows: (string | number)[][]): SheetData {
  return [
    headers.map((value) => ({ value, fontWeight: 'bold' as const })),
    ...rows.map((r) => r.map((value) => ({ value }))),
  ];
}

export async function downloadExcel(
  fileName: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  rightToLeft: boolean,
): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const widths = headers.map((h, i) =>
    Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2),
  );
  await writeExcelFile(buildSheet(headers, rows), {
    sheet: sheetName.slice(0, 31),
    columns: widths.map((width) => ({ width })),
    stickyRowsCount: 1,
    rightToLeft,
  }).toFile(fileName);
}

export async function readFirstSheet(file: File): Promise<unknown[][]> {
  const { readSheet } = await import('read-excel-file/universal');
  return (await readSheet(file)) as unknown[][];
}
