import {
  CLASS_ALIASES, EMAIL_ALIASES, FIRST_NAME_ALIASES, HeaderAliases, ImportClass, LAST_NAME_ALIASES,
  NAME_ALIASES, classMatcher, hasNameColumn, locateTable, matchClassByTitle, readField, readName,
} from './excel-sheet';

/** Teachers have one class; subject teachers have a subject and any number of classes. */
export type StaffKind = 'teacher' | 'subject_teacher';

export type StaffImportRow = {
  /** Row number in the spreadsheet (1-based), so problems can be pointed at. */
  row: number;
  fullName: string;
  email: string;
  subject: string;
  /** Class text as written in the file, kept for the preview. */
  classText: string;
  classIds: string[];
  /** Translation key of the reason this row will be skipped, if any. */
  skipReason?: string;
  /** Translation key of a non-blocking note; `{{name}}` is the class text it couldn't match. */
  warning?: string;
  warningName?: string;
};

export type StaffImportResult = {
  rows: StaffImportRow[];
  title: string;
  suggestedClassId: string;
};

type Field = 'fullName' | 'firstName' | 'lastName' | 'email' | 'subject' | 'classText';

const HEADER_ALIASES: HeaderAliases<Field> = {
  fullName: [
    ...NAME_ALIASES, 'teachername', 'teacher',
    'اسمالمعلم', 'المعلم', 'اسمالمعلمة', 'المعلمة', 'اسمالمدرس', 'المدرس',
    'שםהמורה', 'המורה', 'מורה',
  ],
  firstName: FIRST_NAME_ALIASES,
  lastName: LAST_NAME_ALIASES,
  email: EMAIL_ALIASES,
  subject: ['subject', 'subjects', 'course', 'المادة', 'مادة', 'الموضوع', 'מקצוע', 'המקצוע', 'תחום'],
  classText: [...CLASS_ALIASES, 'classes', 'الصفوف', 'الفصول', 'صفوف', 'כיתות'],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns the rows of an uploaded sheet into teachers or subject teachers to create.
 *
 * The header is found as `locateTable` describes; without one, the columns are read as name,
 * email, class (teachers) or name, email, subject, classes (subject teachers). Subject teachers'
 * classes may be listed in one cell separated by commas. Every row needs a name and an email,
 * since teachers log in with their email; emails already in the school or repeated are skipped.
 */
export function parseStaffSheet(
  sheet: unknown[][],
  kind: StaffKind,
  classes: ImportClass[],
  existingEmails: Iterable<string>,
): StaffImportResult {
  const table = locateTable<Field>(
    sheet,
    HEADER_ALIASES,
    hasNameColumn,
    () => (kind === 'teacher' ? ['fullName', 'email', 'classText'] : ['fullName', 'email', 'subject', 'classText']),
    /\p{L}/u,
  );
  if (!table) return { rows: [], title: '', suggestedClassId: '' };

  const findClass = classMatcher(classes);
  const taken = new Set(Array.from(existingEmails, (e) => e.trim().toLowerCase()));

  const rows: StaffImportRow[] = [];
  for (let i = table.firstDataRow; i < sheet.length; i++) {
    const r = sheet[i] ?? [];
    const fullName = readName(table, r);
    const email = readField(table, r, 'email').toLowerCase();
    const subject = kind === 'subject_teacher' ? readField(table, r, 'subject') : '';
    const classText = readField(table, r, 'classText');
    if (!fullName && !email && !subject && !classText) continue;

    const row: StaffImportRow = { row: i + 1, fullName, email, subject, classText, classIds: [] };

    const names = kind === 'teacher' ? [classText] : classText.split(/[,،;\n/]+/);
    const unknown: string[] = [];
    for (const name of names.map((n) => n.trim()).filter(Boolean)) {
      const match = findClass(name);
      if (match && !row.classIds.includes(match.id)) row.classIds.push(match.id);
      else if (!match) unknown.push(name);
    }
    if (unknown.length) {
      row.warning = 'STAFF_IMPORT.WARN_UNKNOWN_CLASS';
      row.warningName = unknown.join(', ');
    }

    if (!fullName) row.skipReason = 'STAFF_IMPORT.SKIP_NO_NAME';
    else if (!email) row.skipReason = 'STAFF_IMPORT.SKIP_NO_EMAIL';
    else if (!EMAIL_PATTERN.test(email)) row.skipReason = 'STAFF_IMPORT.SKIP_BAD_EMAIL';
    else if (taken.has(email)) row.skipReason = 'STAFF_IMPORT.SKIP_DUPLICATE';

    if (!row.skipReason) taken.add(email);
    rows.push(row);
  }
  return { rows, title: table.title, suggestedClassId: matchClassByTitle(table.title, classes) };
}
