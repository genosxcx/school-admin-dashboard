import {
  CLASS_ALIASES, EMAIL_ALIASES, FIRST_NAME_ALIASES, HeaderAliases, ImportClass, LAST_NAME_ALIASES,
  NAME_ALIASES, classMatcher, hasNameColumn, locateTable, matchClassByTitle, readField, readName,
} from '../../shared/excel/excel-sheet';

export type { ImportClass } from '../../shared/excel/excel-sheet';

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

// A specific "رقم الهوية" beats a generic "رقم" serial column because earlier aliases win.
const HEADER_ALIASES: HeaderAliases<Field> = {
  studentId: [
    'id', 'studentid', 'idnumber', 'studentnumber', 'studentno',
    'رقمالهوية', 'الهوية', 'هوية', 'رقمالطالب',
    'תז', 'תזתלמיד', 'מספרזהות', 'מספרתלמיד', 'מזהה',
    'number', 'رقم', 'الرقم', 'מספר',
  ],
  fullName: [...NAME_ALIASES, 'studentname', 'student', 'اسمالطالب', 'الطالب', 'שםהתלמיד', 'שםתלמיד', 'תלמיד'],
  firstName: FIRST_NAME_ALIASES,
  lastName: LAST_NAME_ALIASES,
  classText: CLASS_ALIASES,
  email: EMAIL_ALIASES,
};

/**
 * Turns the rows of an uploaded sheet into students to create.
 *
 * The header is found as `locateTable` describes; without one, a one-column sheet is read as
 * names only, and a wider one as ID, name, class, email in that order. Students without an ID
 * get a generated one, and IDs that already exist in the school or repeat in the file are skipped.
 */
export function parseStudentSheet(
  sheet: unknown[][],
  classes: ImportClass[],
  existingIds: Iterable<string>,
  fixedClassId?: string,
): ImportResult {
  const table = locateTable<Field>(
    sheet,
    HEADER_ALIASES,
    hasNameColumn,
    (width) => (width <= 1 ? ['fullName'] : ['studentId', 'fullName', 'classText', 'email']),
    /\d/,
  );
  if (!table) return { rows: [], title: '', suggestedClassId: '' };

  const findClass = classMatcher(classes);
  const taken = new Set(Array.from(existingIds, (id) => id.trim().toLowerCase()));

  const rows: ImportRow[] = [];
  for (let i = table.firstDataRow; i < sheet.length; i++) {
    const r = sheet[i] ?? [];
    const fullName = readName(table, r);
    let studentId = readField(table, r, 'studentId');
    const classText = readField(table, r, 'classText');
    const email = readField(table, r, 'email');
    if (!fullName && !studentId && !classText && !email) continue;

    const row: ImportRow = {
      row: i + 1, studentId, fullName, email, classId: '', classText, generatedId: false,
    };

    if (fixedClassId) {
      row.classId = fixedClassId;
    } else if (classText) {
      const match = findClass(classText);
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
  return {
    rows,
    title: table.title,
    suggestedClassId: fixedClassId ? '' : matchClassByTitle(table.title, classes),
  };
}

function generateStudentId(taken: Set<string>): string {
  let id = '';
  do {
    id = String(100000 + Math.floor(Math.random() * 900000));
  } while (taken.has(id));
  return id;
}
