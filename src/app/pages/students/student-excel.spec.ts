import { parseStudentSheet } from './student-excel';

const classes = [{ id: 'c1', name: 'A1' }, { id: 'c2', name: 'B2' }];

describe('parseStudentSheet', () => {
  it('reads English headers and matches classes by name', () => {
    const rows = parseStudentSheet(
      [['Student ID', 'Full Name', 'Class'], [1001, 'Sara Ali', 'a1'], ['1002', 'Omar', 'Z9']],
      classes,
      [],
    ).rows;
    expect(rows.map((r) => [r.studentId, r.fullName, r.classId, r.warning])).toEqual([
      ['1001', 'Sara Ali', 'c1', undefined],
      ['1002', 'Omar', '', 'STUDENT_IMPORT.WARN_UNKNOWN_CLASS'],
    ]);
  });

  it('reads Arabic and Hebrew headers, and joins first and last names', () => {
    const ar = parseStudentSheet([['الاسم', 'رقم الطالب'], ['ليلى', '7']], classes, []).rows;
    expect(ar[0]).toMatchObject({ studentId: '7', fullName: 'ليلى' });

    const he = parseStudentSheet([['ת.ז.', 'שם פרטי', 'שם משפחה', 'כיתה'], ['8', 'דנה', 'כהן', 'B2']], classes, []).rows;
    expect(he[0]).toMatchObject({ studentId: '8', fullName: 'דנה כהן', classId: 'c2' });
  });

  it('generates IDs for a names-only sheet and skips duplicates and blanks', () => {
    const rows = parseStudentSheet([['Name', 'ID'], ['Ali', ''], ['', ''], ['Mona', 'x1'], ['Huda', 'X1'], ['Rami', '55']], classes, ['55']).rows;
    expect(rows.length).toBe(4);
    expect(rows[0].generatedId).toBe(true);
    expect(rows[0].studentId).toMatch(/^\d{6}$/);
    expect(rows[1].skipReason).toBeUndefined();
    expect(rows[2].skipReason).toBe('STUDENT_IMPORT.SKIP_DUPLICATE');
    expect(rows[3].skipReason).toBe('STUDENT_IMPORT.SKIP_DUPLICATE');
  });

  it('falls back to column order without a header, and forces a teacher class', () => {
    const rows = parseStudentSheet([['1', 'Ali', 'A1'], ['2', 'Mona', 'B2']], classes, [], 'c2').rows;
    expect(rows.map((r) => [r.studentId, r.fullName, r.classId])).toEqual([['1', 'Ali', 'c2'], ['2', 'Mona', 'c2']]);
    expect(parseStudentSheet([['Ali'], ['Mona']], classes, []).rows[1].fullName).toBe('Mona');
  });

  it('skips IDs that cannot be part of a login email', () => {
    expect(parseStudentSheet([['ID', 'Name'], ['12 34', 'Ali']], classes, []).rows[0].skipReason).toBe('STUDENT_IMPORT.SKIP_BAD_ID');
  });

  it('finds the header below a title row, ignores the # column and suggests the class from the title', () => {
    const sheet = [
      ['#', '10-הייטק (רולא סוויטי)', null],
      [null, 'رقم الهوية', 'اسم'],
      [1, 335686788, 'امنه'],
      [2, 335736898, 'ايلول'],
    ];
    const result = parseStudentSheet(sheet, [{ id: 'c9', name: '10-הייטק' }, { id: 'c1', name: '1' }], []);
    expect(result.title).toBe('10-הייטק (רולא סוויטי)');
    expect(result.suggestedClassId).toBe('c9');
    expect(result.rows.map((r) => [r.studentId, r.fullName, r.classId, r.skipReason])).toEqual([
      ['335686788', 'امنه', '', undefined],
      ['335736898', 'ايلول', '', undefined],
    ]);
  });

  it('skips a 1, 2, 3 counter column when there is no header', () => {
    const rows = parseStudentSheet([[1, '501', 'Ali'], [2, '502', 'Mona']], classes, []).rows;
    expect(rows.map((r) => [r.studentId, r.fullName])).toEqual([['501', 'Ali'], ['502', 'Mona']]);
  });
});
