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

type Field = 'studentId' | 'fullName' | 'firstName' | 'lastName' | 'classText' | 'email';

// Header names are compared after lower-casing and dropping spaces and punctuation,
// so "Student ID", "student_id" and "ת.ז." all match.
const HEADER_ALIASES: Record<Field, string[]> = {
  studentId: [
    'id', 'studentid', 'studentnumber', 'studentno', 'number', 'idnumber',
    'رقم', 'رقمالطالب', 'رقمالهوية', 'الهوية', 'هوية', 'الرقم',
    'תז', 'תזתלמיד', 'מספרזהות', 'מספרתלמיד', 'מזהה', 'מספר',
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
  row.forEach((cell, index) => {
    const key = normalize(cell);
    if (!key) return;
    for (const field of Object.keys(HEADER_ALIASES) as Field[]) {
      if (columns[field] === undefined && HEADER_ALIASES[field].includes(key)) {
        columns[field] = index;
        return;
      }
    }
  });
  const hasName = columns.fullName !== undefined || columns.firstName !== undefined;
  return hasName ? columns : {};
}

/**
 * Turns the rows of an uploaded sheet into students to create.
 *
 * The first non-empty row is treated as a header when it names a name column (English, Arabic
 * or Hebrew). Without a recognised header, a one-column sheet is read as names only, and a wider
 * one as ID, name, class, email in that order. Students without an ID get a generated one, and
 * IDs that already exist in the school or repeat in the file are skipped.
 */
export function parseStudentSheet(
  sheet: unknown[][],
  classes: ImportClass[],
  existingIds: Iterable<string>,
  fixedClassId?: string,
): ImportRow[] {
  const start = sheet.findIndex((r) => r.some((c) => cellText(c) !== ''));
  if (start < 0) return [];

  let columns = findHeader(sheet[start]);
  let firstDataRow = start + 1;
  if (!Object.keys(columns).length) {
    const width = Math.max(...sheet.map((r) => r.filter((c) => cellText(c) !== '').length));
    columns = width <= 1 ? { fullName: 0 } : { studentId: 0, fullName: 1, classText: 2, email: 3 };
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
  return rows;
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
