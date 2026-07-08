import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  updateDoc,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc } from 'firebase/firestore'; // Make sure setDoc is imported
import { environment } from '../../../environments/environment';
import { db } from '../../firebase';
// Add these to your existing imports
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// ---------------- TYPES ----------------

export type Teacher = {
  id?: string;
  role?: 'teacher' | 'principal';
  schoolId: string;
  fullName: string;
  email?: string;
  classId?: string;
};
export type SubjectTeacher = {
  id?: string;
  role?: 'subject_teacher';
  schoolId: string;
  fullName: string;
  email?: string;
  subject?: string; // e.g., "Arabic Reading", "Math"
  classIds?: string[]; // Array of connected class IDs
};
export type Student = {
  id?: string;
  role?: 'student';
  schoolId: string;
  
  studentId?: string;
  loginEmail?: string;

  fullName: string;
  email?: string;
  classId?: string;
  grade?: number;           // 0..100
  completion?: number;      // 0..1 or 0..100
  minutesRecorded?: number; // total minutes
};
export type SchoolClass = {
  id?: string;
  schoolId: string;
  name: string; // shown in UI (e.g., "A1")
};
export type Assignment = {
  id?: string;
  schoolId: string;
  teacherId: string;
  title: string;
  description: string;
  classIds: string[];
  fileUrl?: string;
  createdAt: number;
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
    const qy = query(ref, where('role', '==', 'teacher'), where('schoolId', '==', schoolId));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({
        id: d.id,
        role: d.data()['role'],
        schoolId: d.data()['schoolId'],
        fullName: this.normalizeFullName(d.data()),
        email: (d.data()['email'] ?? '').toString(),
        classId: (d.data()['classId'] ?? '').toString(),
    } as Teacher));
  }

  async createTeacher(
    schoolId: string,
    payload: { fullName: string; email?: string; classId?: string; password?: string }
  ) {
    let authUid = '';

    // 1. Create the Auth account using a secondary Firebase app instance
    if (payload.email && payload.password) {
      // Create a uniquely named secondary app
      const secondaryAppName = 'SecondaryAppTeacher_' + Date.now();
      const secondaryApp = initializeApp(environment.firebase, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          payload.email.trim(), 
          payload.password
        );
        authUid = userCredential.user.uid;
      } catch (error) {
        console.error("Failed to create Auth user:", error);
        throw error; // Stop execution if auth creation fails
      } finally {
        // Always delete the secondary app to prevent memory leaks and conflicts
        await deleteApp(secondaryApp);
      }
    }

    // 2. Save the data to Firestore
    if (authUid) {
      const docRef = doc(db, 'users', authUid);
      await setDoc(docRef, {
        role: 'teacher',
        schoolId,
        fullName: payload.fullName.trim(),
        email: (payload.email ?? '').trim(),
        classId: (payload.classId ?? '').trim(),
        status: 'APPROVED' // ✅ Add this line
      });
      return authUid;
    } else {
      const ref = collection(db, 'users');
      const docRef = await addDoc(ref, {
        role: 'teacher',
        schoolId,
        fullName: payload.fullName.trim(),
        email: (payload.email ?? '').trim(),
        classId: (payload.classId ?? '').trim(),
        status: 'APPROVED' // ✅ Add this line
      });
      return docRef.id;
    }
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
// ---------------- SUBJECT TEACHERS (users collection) ----------------

  async getSubjectTeachers(schoolId: string): Promise<SubjectTeacher[]> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'subject_teacher'),
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
        subject: (data.subject ?? '').toString(),
        // Ensure classIds is always an array
        classIds: Array.isArray(data.classIds) ? data.classIds : [],
      } as SubjectTeacher;
    });
  }

  async createSubjectTeacher(
    schoolId: string,
    payload: { fullName: string; email?: string; subject?: string; classIds?: string[], password?: string }
  ) {
    let authUid = '';

    // 1. Create the Auth account using a secondary Firebase app instance
    if (payload.email && payload.password) {
      // Create a uniquely named secondary app
      const secondaryAppName = 'SecondaryApp_' + Date.now();
      const secondaryApp = initializeApp(environment.firebase, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          payload.email.trim(), 
          payload.password
        );
        authUid = userCredential.user.uid;
      } catch (error) {
        console.error("Failed to create Auth user:", error);
        throw error; // Stop execution if auth creation fails
      } finally {
        // Always delete the secondary app to prevent memory leaks and conflicts
        await deleteApp(secondaryApp);
      }
    }

// 2. Save the data to Firestore
    if (authUid) {
      const docRef = doc(db, 'users', authUid);
      await setDoc(docRef, {
        role: 'subject_teacher',
        schoolId,
        fullName: payload.fullName.trim(),
        email: (payload.email ?? '').trim(),
        subject: (payload.subject ?? '').trim(),
        classIds: payload.classIds ?? [],
        status: 'APPROVED' // ✅ Add this line
      });
      return authUid;
    } else {
      const ref = collection(db, 'users');
      const docRef = await addDoc(ref, {
        role: 'subject_teacher',
        schoolId,
        fullName: payload.fullName.trim(),
        email: (payload.email ?? '').trim(),
        subject: (payload.subject ?? '').trim(),
        classIds: payload.classIds ?? [],
        status: 'APPROVED' // ✅ Add this line
      });
      return docRef.id;
    }  }

  async updateSubjectTeacher(
    teacherId: string,
    patch: Partial<Pick<SubjectTeacher, 'fullName' | 'email' | 'subject' | 'classIds'>>
  ) {
    const ref = doc(db, 'users', teacherId);
    await updateDoc(ref, {
      ...(patch.fullName !== undefined ? { fullName: patch.fullName.trim() } : {}),
      ...(patch.email !== undefined ? { email: (patch.email ?? '').trim() } : {}),
      ...(patch.subject !== undefined ? { subject: (patch.subject ?? '').trim() } : {}),
      ...(patch.classIds !== undefined ? { classIds: patch.classIds } : {}),
    });
  }

  async deleteSubjectTeacher(teacherId: string) {
    const ref = doc(db, 'users', teacherId);
    await deleteDoc(ref);
  }

  async countSubjectTeachers(schoolId: string): Promise<number> {
    const ref = collection(db, 'users');
    const qy = query(
      ref,
      where('role', '==', 'subject_teacher'),
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
        studentId: (data.studentId ?? '').toString(), // ✅ Map studentId
        fullName: this.normalizeFullName(data),
        email: (data.email ?? '').toString(),
        loginEmail: (data.loginEmail ?? '').toString(), // ✅ Pull dummy email if it exists
        classId: (data.classId ?? '').toString(),
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
        studentId: (data.studentId ?? '').toString(), // ✅ Map studentId
        fullName: this.normalizeFullName(data),
        email: (data.email ?? '').toString(),
        loginEmail: (data.loginEmail ?? '').toString(), 
        classId: (data.classId ?? '').toString(),
        grade: this.toNumber(data.grade, 0),
        completion: this.toNumber(data.completion, 0),
        minutesRecorded: this.toNumber(data.minutesRecorded, 0),
      } as Student;
    });
  }
async createStudent(
    schoolId: string,
    payload: { studentId: string; fullName: string; email?: string; classId?: string; password?: string }
  ) {
    let authUid = '';
    
    // The email they typed in the form (can be blank)
    const actualEmail = (payload.email ?? '').trim();
    
    // ✅ GUARANTEED UNIQUE: Append Date.now() so it NEVER collides with an old deleted account
    // Example: "john123_1713214567890@student.local"
    const authEmail = `${payload.studentId.toLowerCase()}_${Date.now()}@student.local`; 

    if (payload.password) {
      // NOTE: Make sure 'environment' is imported at the top of this file!
      const secondaryAppName = 'SecondaryAppStudent_' + Date.now();
      const secondaryApp = initializeApp(environment.firebase, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        // ✅ We ONLY pass the guaranteed unique authEmail to Firebase
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          authEmail, 
          payload.password
        );
        authUid = userCredential.user.uid;
      } catch (error) {
        console.error("Failed to create Auth user for student:", error);
        throw error; 
      } finally {
        await deleteApp(secondaryApp);
      }
    }

    const studentData = {
      role: 'student',
      schoolId,
      studentId: payload.studentId.trim(), 
      fullName: payload.fullName.trim(),
      email: actualEmail, // We save what they typed just for your records
      loginEmail: authEmail, // The unique dummy email they will use to log in
      classId: (payload.classId ?? '').trim(),
      status: 'APPROVED', 
      grade: 0,
      completion: 0,
      minutesRecorded: 0,
    };

    if (authUid) {
      const docRef = doc(db, 'users', authUid);
      await setDoc(docRef, studentData);
      return authUid;
    } else {
      const ref = collection(db, 'users');
      const docRef = await addDoc(ref, studentData);
      return docRef.id;
    }
  }  async updateStudent(
    studentId: string,
    patch: Partial<Pick<Student, 'studentId' | 'fullName' | 'email' | 'classId' | 'grade' | 'completion' | 'minutesRecorded'>>
  ) {
    const ref = doc(db, 'users', studentId);
    await updateDoc(ref, {
      ...(patch.studentId !== undefined ? { studentId: patch.studentId.trim() } : {}), // ✅ Handle studentId
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
async getStudentsForSubjectTeacher(schoolId: string, classIds: string[]): Promise<Student[]> {
    if (!classIds || classIds.length === 0) return [];

    // Firestore 'in' queries are limited to 10 items per batch. 
    // If a teacher has more than 10 classes, we have to split the request.
    const chunks = [];
    for (let i = 0; i < classIds.length; i += 10) {
      chunks.push(classIds.slice(i, i + 10));
    }

    const ref = collection(db, 'users');
    let allStudents: Student[] = [];

    for (const chunk of chunks) {
      const qy = query(
        ref,
        where('role', '==', 'student'),
        where('schoolId', '==', schoolId),
        where('classId', 'in', chunk) // Get students in ANY of these classes
      );
      const snap = await getDocs(qy);
      
      const chunkStudents = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          role: data.role,
          schoolId: data.schoolId,
          fullName: this.normalizeFullName(data),
          email: (data.email ?? '').toString(),
          classId: (data.classId ?? '').toString(),
          grade: this.toNumber(data.grade, 0),
          completion: this.toNumber(data.completion, 0),
          minutesRecorded: this.toNumber(data.minutesRecorded, 0),
        } as Student;
      });

      allStudents = [...allStudents, ...chunkStudents];
    }

    return allStudents;
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

  // ---------------- ASSIGNMENTS (assignments collection) ----------------

  async getAssignmentsForTeacher(schoolId: string, teacherId: string): Promise<Assignment[]> {
    const ref = collection(db, 'assignments');
    const qy = query(
      ref,
      where('schoolId', '==', schoolId),
      where('teacherId', '==', teacherId)
    );
    const snap = await getDocs(qy);

    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
  }

  async createAssignment(
    schoolId: string,
    teacherId: string,
    payload: { title: string; description: string; classIds: string[]; fileUrl?: string }
  ) {
    const ref = collection(db, 'assignments');
    const docRef = await addDoc(ref, {
      schoolId,
      teacherId,
      title: payload.title.trim(),
      description: payload.description.trim(),
      classIds: payload.classIds ?? [],
      fileUrl: payload.fileUrl ?? '',
      createdAt: Date.now()
    });
    return docRef.id;
  }

  async deleteAssignment(assignmentId: string) {
    const ref = doc(db, 'assignments', assignmentId);
    await deleteDoc(ref);
  }
  // ---------------- SCHOOL BRANDING ----------------
  
  /**
   * Fetches the school name and logo URL.
   */
  async getSchoolDetails(schoolId: string) {
    const docRef = doc(db, 'schools', schoolId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  }

  /**
   * Updates the school name and logo URL.
   */
  async updateSchoolDetails(schoolId: string, data: { name: string, logoUrl: string }) {
    const docRef = doc(db, 'schools', schoolId);
    // Use setDoc with merge: true to create the doc if it doesn't exist
    await setDoc(docRef, data, { merge: true });
  }
  /**
 * Uploads a logo file to Firebase Storage and returns the download URL.
 */
async uploadLogo(schoolId: string, file: File): Promise<string> {
  const storage = getStorage();
  // We use the schoolId as part of the path to keep files organized
  const storageRef = ref(storage, `schools/${schoolId}/logo`);
  
  // Upload the file
  const snapshot = await uploadBytes(storageRef, file);
  
  // Get the public download URL
  return await getDownloadURL(snapshot.ref);
}
}