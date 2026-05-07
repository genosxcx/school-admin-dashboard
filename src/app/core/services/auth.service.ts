import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<User | null>(null);
  user$ = this._user$.asObservable();

  private isInitialized = false;

  constructor() {
    console.log('[AuthService] Initializing...');
    onAuthStateChanged(auth, (user) => {
      this.isInitialized = true; 
      console.log('[AuthService] Auth state changed, user:', user?.uid ?? 'null');
      this._user$.next(user);
    });
  }

  get currentUser(): User | null {
    return this._user$.value;
  }

  waitForAuth(): Promise<User | null> {
    if (this.isInitialized) {
      return Promise.resolve(this.currentUser);
    }
    
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        this.isInitialized = true;
        unsubscribe();
        resolve(user);
      });
    });
  }

  async login(email: string, password: string) {
    const SUPERADMIN_EMAIL = 'ayansar85@gmail.com';
    const cred = await signInWithEmailAndPassword(auth, email, password);

    if ((email ?? '').toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
      return cred;
    }

    const uid = cred.user.uid;

    // 1. Check if they are a student in the 'users' collection
    const studentSnap = await getDoc(doc(db, 'users', uid));
    if (studentSnap.exists()) {
      const data = studentSnap.data() as any;
      if (data?.approved !== true && data?.status !== 'APPROVED') {
        await signOut(auth);
        throw new Error('Your student account is pending approval.');
      }
      return cred; // Approved Student
    }

    // 2. Check if they are a Teacher
    const teacherSnap = await getDoc(doc(db, 'teachers', uid));
    if (teacherSnap.exists()) return cred; // Allowed

    // 3. Check if they are a Subject Teacher
    const subjectTeacherSnap = await getDoc(doc(db, 'subjectTeachers', uid));
    if (subjectTeacherSnap.exists()) return cred; // Allowed

    // If they have a valid Firebase Auth login but aren't in the above collections,
    // we allow them through (e.g., Principals or Admins that might be stored elsewhere).
    return cred;
  }

  logout() {
    return signOut(auth);
  }

  async changePassword(newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently logged in.');
    await updatePassword(user, newPassword);
  }
}