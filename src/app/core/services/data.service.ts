import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../firebase';

// ---------------- TYPES ----------------

export type Teacher = {
  id?: string;
  role?: 'teacher' | 'principal';
  schoolId: string;
  fullName: string;
  email?: string;
  classId?: string;
};

export type Student = {
  id?: string;
  role?: 'student';
  schoolId: string;
  fullName: string;
  email?: string;
  classId?: string;

  // ✅ stats fields (optional)
  grade?: number;           // 0..100
  completion?: number;      // 0..1 or 0..100
  minutesRecorded?: number; // total minutes
};

export type SchoolClass = {
  id?: string;
  schoolId: string;
  name: string; // shown in UI (e.g., "A1")
};

@Injectable({ providedIn: 'root' })
export class DataService {
  // ---------------- HELPERS ----------------

  private normalizeFullName(data: any): string {
    return (data?.fullName ?? data?.fullname ?? '').toString();
  }

  private toNumber(v: any, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  // ---------------- TEACHERS (users collection) ----------------

  async getTeachers(schoolId: string): Promise<Teacher[]> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'teacher'),
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(qy);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        role: data.role,
        schoolId: data.schoolId,
        fullName: this.normalizeFullName(data),
        email: (data.email ?? '').toString(),
        classId: (data.classId ?? '').toString(),
      } as Teacher;
    });
  }

  async createTeacher(
    schoolId: string,
    payload: { fullName: string; email?: string; classId?: string }
  ) {
    const ref = collection(db, 'users');
    const docRef = await addDoc(ref, {
      role: 'teacher',
      schoolId,
      fullName: payload.fullName.trim(),
      email: (payload.email ?? '').trim(),
      classId: (payload.classId ?? '').trim(),
    });
    return docRef.id;
  }

  async updateTeacher(
    teacherId: string,
    patch: Partial<Pick<Teacher, 'fullName' | 'email' | 'classId'>>
  ) {
    const ref = doc(db, 'users', teacherId);
    await updateDoc(ref, {
      ...(patch.fullName !== undefined ? { fullName: patch.fullName.trim() } : {}),
      ...(patch.email !== undefined ? { email: (patch.email ?? '').trim() } : {}),
      ...(patch.classId !== undefined ? { classId: (patch.classId ?? '').trim() } : {}),
    });
  }

  async deleteTeacher(teacherId: string) {
    const ref = doc(db, 'users', teacherId);
    await deleteDoc(ref);
  }

  async countTeachers(schoolId: string): Promise<number> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'teacher'),
      where('schoolId', '==', schoolId)
    );
    const agg = await getCountFromServer(qy);
    return agg.data().count ?? 0;
  }

  // ---------------- STUDENTS (users collection) ----------------

  async getStudents(schoolId: string): Promise<Student[]> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'student'),
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(qy);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        role: data.role,
        schoolId: data.schoolId,
        fullName: this.normalizeFullName(data),
        email: (data.email ?? '').toString(),
        classId: (data.classId ?? '').toString(),

        // ✅ read stats fields
        grade: this.toNumber(data.grade, 0),
        completion: this.toNumber(data.completion, 0),
        minutesRecorded: this.toNumber(data.minutesRecorded, 0),
      } as Student;
    });
  }

  async getStudentsByClass(schoolId: string, classId: string): Promise<Student[]> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'student'),
      where('schoolId', '==', schoolId),
      where('classId', '==', classId)
    );
    const snap = await getDocs(qy);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        role: data.role,
        schoolId: data.schoolId,
        fullName: this.normalizeFullName(data),
        email: (data.email ?? '').toString(),
        classId: (data.classId ?? '').toString(),

        // ✅ read stats fields
        grade: this.toNumber(data.grade, 0),
        completion: this.toNumber(data.completion, 0),
        minutesRecorded: this.toNumber(data.minutesRecorded, 0),
      } as Student;
    });
  }

  async createStudent(
    schoolId: string,
    payload: { fullName: string; email?: string; classId?: string }
  ) {
    const ref = collection(db, 'users');
    const docRef = await addDoc(ref, {
      role: 'student',
      schoolId,
      fullName: payload.fullName.trim(),
      email: (payload.email ?? '').trim(),
      classId: (payload.classId ?? '').trim(),

      // optional defaults for stats
      grade: 0,
      completion: 0,
      minutesRecorded: 0,
    });
    return docRef.id;
  }

  async updateStudent(
    studentId: string,
    patch: Partial<Pick<Student, 'fullName' | 'email' | 'classId' | 'grade' | 'completion' | 'minutesRecorded'>>
  ) {
    const ref = doc(db, 'users', studentId);
    await updateDoc(ref, {
      ...(patch.fullName !== undefined ? { fullName: patch.fullName.trim() } : {}),
      ...(patch.email !== undefined ? { email: (patch.email ?? '').trim() } : {}),
      ...(patch.classId !== undefined ? { classId: (patch.classId ?? '').trim() } : {}),

      ...(patch.grade !== undefined ? { grade: this.toNumber(patch.grade, 0) } : {}),
      ...(patch.completion !== undefined ? { completion: this.toNumber(patch.completion, 0) } : {}),
      ...(patch.minutesRecorded !== undefined
        ? { minutesRecorded: this.toNumber(patch.minutesRecorded, 0) }
        : {}),
    });
  }

  async deleteStudent(studentId: string) {
    const ref = doc(db, 'users', studentId);
    await deleteDoc(ref);
  }

  async countStudents(schoolId: string): Promise<number> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'student'),
      where('schoolId', '==', schoolId)
    );
    const agg = await getCountFromServer(qy);
    return agg.data().count ?? 0;
  }

  // ---------------- CLASSES (classes collection) ----------------

  async getClasses(schoolId: string): Promise<SchoolClass[]> {
    const ref = collection(db, 'classes');
    const qy = query(ref, where('schoolId', '==', schoolId));
    const snap = await getDocs(qy);

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        schoolId: data.schoolId,
        name: (data.name ?? '').toString(),
      } as SchoolClass;
    });
  }

  async createClass(schoolId: string, name: string) {
    const ref = collection(db, 'classes');
    const docRef = await addDoc(ref, { schoolId, name: name.trim() });
    return docRef.id;
  }

  async updateClass(classId: string, name: string) {
    const ref = doc(db, 'classes', classId);
    await updateDoc(ref, { name: name.trim() });
  }

  async deleteClass(classId: string) {
    const ref = doc(db, 'classes', classId);
    await deleteDoc(ref);
  }

  async countClasses(schoolId: string): Promise<number> {
    const ref = collection(db, 'classes');
    const qy = query(ref, where('schoolId', '==', schoolId));
    const agg = await getCountFromServer(qy);
    return agg.data().count ?? 0;
  }

  // ---------------- STATS HELPERS ----------------

  /**
   * Total minutes for the whole school.
   * Implementation: sums minutesRecorded from all student docs.
   */
  async totalMinutesRecorded(schoolId: string): Promise<number> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'student'),
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(qy);

    let total = 0;
    snap.forEach((d) => {
      const data = d.data() as any;
      total += this.toNumber(data.minutesRecorded, 0);
    });

    return total;
  }

  // ---------------- OTHER ----------------

  async totalMinutes(schoolId: string): Promise<number> {
    // keep old API but make it real
    return this.totalMinutesRecorded(schoolId);
  }
}