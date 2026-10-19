import type { SheetData } from 'write-excel-file/browser';

export type ImportClass = { id: string; name: string };

export type ImportRow = {
  /** Row number in the spreadsheet (1-based), so problems can be pointed at. */
  row: number;
  studentId: string;
  fullName: string;
  email: string;
  classId: string;
  /** Class text as written in the file, kept for the preview. */
  classText: string;
  /** True when the file had no ID for this student and one was generated. */
  generatedId: boolean;
  /** Translation key of the reason this row will be skipped, if any. */
  skipReason?: string;
  /** Translation key of a non-blocking note, such as an unknown class. */
  warning?: string;
};

export type ImportResult = {
  rows: ImportRow[];
  /** Text above the header row, such as a class title, shown so the class choice makes sense. */
  title: string;
  /** Class the title points at, offered for students the file gives no class for. */
  suggestedClassId: string;
};

type Field = 'studentId' | 'fullName' | 'firstName' | 'lastName' | 'classText' | 'email';

// Header names are compared after lower-casing and dropping spaces and punctuation,
// so "Student ID", "student_id" and "ת.ז." all match. Within a field, earlier aliases win
// when several columns match, so a specific "رقم الهوية" beats a generic "رقم" serial column.
const HEADER_ALIASES: Record<Field, string[]> = {
  studentId: [
    'id', 'studentid', 'idnumber', 'studentnumber', 'studentno',
    'رقمالهوية', 'الهوية', 'هوية', 'رقمالطالب',
    'תז', 'תזתלמיד', 'מספרזהות', 'מספרתלמיד', 'מזהה',
    'number', 'رقم', 'الرقم', 'מספר',
  ],
  fullName: [
    'name', 'fullname', 'studentname', 'student',
    'الاسم', 'اسم', 'الاسمالكامل', 'اسمالطالب', 'الطالب',
    'שם', 'שםמלא', 'שםהתלמיד', 'שםתלמיד', 'תלמיד',
  ],
  firstName: ['firstname', 'givenname', 'الاسمالأول', 'الاسمالاول', 'שםפרטי'],
  lastName: ['lastname', 'surname', 'familyname', 'اسمالعائلة', 'العائلة', 'שםמשפחה'],
  classText: ['class', 'classname', 'الصف', 'صف', 'الفصل', 'فصل', 'כיתה'],
  email: ['email', 'mail', 'emailaddress', 'البريد', 'البريدالإلكتروني', 'البريدالالكتروني', 'דואל', 'אימייל', 'מייל'],
};

/** How many rows at the top of a sheet may be titles or notes before the header. */
const HEADER_SEARCH_ROWS = 10;

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function findHeader(row: unknown[]): Partial<Record<Field, number>> {
  const columns: Partial<Record<Field, number>> = {};
  const rank: Partial<Record<Field, number>> = {};
  const used = new Set<number>();
  for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
    row.forEach((cell, index) => {
      if (used.has(index)) return;
      const r = HEADER_ALIASES[field].indexOf(normalize(cell));
      if (r >= 0 && (rank[field] === undefined || r < rank[field]!)) {
        rank[field] = r;
        columns[field] = index;
      }
    });
    if (columns[field] !== undefined) used.add(columns[field]!);
  }
  const hasName = columns.fullName !== undefined || columns.firstName !== undefined;
  return hasName ? columns : {};
}

/** True when the first column holds 1, 2, 3… row numbers and the second looks like the IDs. */
function hasCounterColumn(rows: unknown[][]): boolean {
  const counters = rows.map((r) => cellText(r[0])).filter(Boolean);
  return (
    counters.length > 1 &&
    counters.every((v, i) => v === String(i + 1)) &&
    rows.every((r) => /\d/.test(cellText(r[1])))
  );
}

function matchClassByTitle(title: string, classes: ImportClass[]): string {
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

/**
 * Turns the rows of an uploaded sheet into students to create.
 *
 * The header is the first of the top rows that names a name column (English, Arabic or Hebrew);
 * anything above it, such as a class title, is returned as `title`. Columns the header doesn't
 * name, such as a "#" row counter, are ignored. Without a recognised header, a one-column sheet
 * is read as names only, and a wider one as ID, name, class, email in that order (after a
 * leading 1, 2, 3… counter column next to a column of IDs). Students without an ID get a generated one,
 * and IDs that already exist in the school or repeat in the file are skipped.
 */
export function parseStudentSheet(
  sheet: unknown[][],
  classes: ImportClass[],
  existingIds: Iterable<string>,
  fixedClassId?: string,
): ImportResult {
  const nonEmpty = (r: unknown[] | undefined) => (r ?? []).some((c) => cellText(c) !== '');
  const start = sheet.findIndex(nonEmpty);
  if (start < 0) return { rows: [], title: '', suggestedClassId: '' };

  let columns: Partial<Record<Field, number>> = {};
  let headerRow = -1;
  for (let i = start; i < Math.min(sheet.length, start + HEADER_SEARCH_ROWS); i++) {
    columns = findHeader(sheet[i] ?? []);
    if (Object.keys(columns).length) {
      headerRow = i;
      break;
    }
  }

  let firstDataRow = headerRow + 1;
  let title = '';
  if (headerRow >= 0) {
    title = sheet
      .slice(start, headerRow)
      .flatMap((r) => r.map(cellText))
      .filter((t) => normalize(t) !== '')
      .join(' ');
  } else {
    const data = sheet.slice(start);
    const offset = hasCounterColumn(data) ? 1 : 0;
    const width = Math.max(...data.map((r) => r.filter((c) => cellText(c) !== '').length)) - offset;
    columns = width <= 1
      ? { fullName: offset }
      : { studentId: offset, fullName: offset + 1, classText: offset + 2, email: offset + 3 };
    firstDataRow = start;
  }

  const classByKey = new Map<string, ImportClass>();
  for (const c of classes) {
    classByKey.set(normalize(c.name), c);
    classByKey.set(normalize(c.id), c);
  }

  const taken = new Set(Array.from(existingIds, (id) => id.trim().toLowerCase()));
  const get = (r: unknown[], field: Field) =>
    columns[field] === undefined ? '' : cellText(r[columns[field]!]);

  const rows: ImportRow[] = [];
  for (let i = firstDataRow; i < sheet.length; i++) {
    const r = sheet[i] ?? [];
    const fullName =
      get(r, 'fullName') || [get(r, 'firstName'), get(r, 'lastName')].filter(Boolean).join(' ');
    let studentId = get(r, 'studentId');
    const classText = get(r, 'classText');
    const email = get(r, 'email');
    if (!fullName && !studentId && !classText && !email) continue;

    const row: ImportRow = {
      row: i + 1, studentId, fullName, email, classId: '', classText, generatedId: false,
    };

    if (fixedClassId) {
      row.classId = fixedClassId;
    } else if (classText) {
      const match = classByKey.get(normalize(classText));
      if (match) row.classId = match.id;
      else row.warning = 'STUDENT_IMPORT.WARN_UNKNOWN_CLASS';
    }

    if (!fullName) {
      row.skipReason = 'STUDENT_IMPORT.SKIP_NO_NAME';
    } else if (studentId && /[^A-Za-z0-9._-]/.test(studentId)) {
      // The ID becomes part of the login email, so it can only hold English letters, digits, . _ -
      row.skipReason = 'STUDENT_IMPORT.SKIP_BAD_ID';
    } else if (studentId && taken.has(studentId.toLowerCase())) {
      row.skipReason = 'STUDENT_IMPORT.SKIP_DUPLICATE';
    } else if (!studentId) {
      studentId = generateStudentId(taken);
      row.studentId = studentId;
      row.generatedId = true;
    }

    if (!row.skipReason) taken.add(studentId.toLowerCase());
    rows.push(row);
  }
  return { rows, title, suggestedClassId: fixedClassId ? '' : matchClassByTitle(title, classes) };
}

function generateStudentId(taken: Set<string>): string {
  let id = '';
  do {
    id = String(100000 + Math.floor(Math.random() * 900000));
  } while (taken.has(id));
  return id;
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
