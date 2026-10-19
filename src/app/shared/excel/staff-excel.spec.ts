import { parseStaffSheet } from './staff-excel';

const classes = [{ id: 'c1', name: 'A1' }, { id: 'c2', name: 'B2' }];

describe('parseStaffSheet', () => {
  it('reads teachers with Hebrew headers and one class each', () => {
    const { rows } = parseStaffSheet(
      [['שם המורה', 'דוא"ל', 'כיתה'], ['רולא', 'Rula@School.com', 'A1'], ['סמיר', 'samir@school.com', 'Z9']],
      'teacher', classes, [],
    );
    expect(rows.map((r) => [r.fullName, r.email, r.classIds, r.warning])).toEqual([
      ['רולא', 'rula@school.com', ['c1'], undefined],
      ['סמיר', 'samir@school.com', [], 'STAFF_IMPORT.WARN_UNKNOWN_CLASS'],
    ]);
  });

  it('reads subject teachers with Arabic headers, a subject and several classes', () => {
    const { rows } = parseStaffSheet(
      [['الاسم', 'البريد الإلكتروني', 'المادة', 'الصفوف'], ['ليلى', 'layla@s.com', 'رياضيات', 'A1، B2, X']],
      'subject_teacher', classes, [],
    );
    expect(rows[0]).toMatchObject({ subject: 'رياضيات', classIds: ['c1', 'c2'], warningName: 'X' });
  });

  it('skips rows without a valid, new email', () => {
    const { rows } = parseStaffSheet(
      [['Name', 'Email'], ['A', ''], ['B', 'not-an-email'], ['C', 'c@s.com'], ['D', 'C@s.com'], ['E', 'old@s.com']],
      'teacher', classes, ['old@s.com'],
    );
    expect(rows.map((r) => r.skipReason)).toEqual([
      'STAFF_IMPORT.SKIP_NO_EMAIL',
      'STAFF_IMPORT.SKIP_BAD_EMAIL',
      undefined,
      'STAFF_IMPORT.SKIP_DUPLICATE',
      'STAFF_IMPORT.SKIP_DUPLICATE',
    ]);
  });

  it('reads a sheet with a title row, a # column and no header names it knows by order', () => {
    const titled = parseStaffSheet(
      [['מורי שכבה י'], ['#', 'שם', 'מייל'], [1, 'Dana', 'dana@s.com']],
      'teacher', classes, [],
    );
    expect(titled.title).toBe('מורי שכבה י');
    expect(titled.rows[0]).toMatchObject({ fullName: 'Dana', email: 'dana@s.com' });

    const plain = parseStaffSheet([[1, 'Dana', 'dana@s.com', 'Math', 'B2'], [2, 'Omar', 'omar@s.com', 'Art', '']], 'subject_teacher', classes, []);
    expect(plain.rows.map((r) => [r.fullName, r.email, r.subject, r.classIds])).toEqual([
      ['Dana', 'dana@s.com', 'Math', ['c2']],
      ['Omar', 'omar@s.com', 'Art', []],
    ]);
  });
});
