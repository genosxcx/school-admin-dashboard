import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

  // Inject PLATFORM_ID to check if we are rendering on the server or browser
  private platformId = inject(PLATFORM_ID);

  constructor() {
    console.log('[AuthService] Initializing...');
    onAuthStateChanged(auth, (user) => {
      console.log('[AuthService] Auth state changed, user:', user?.uid ?? 'null');
      this._user$.next(user);
    });
  }

  get currentUser(): User | null {
    return this._user$.value;
  }

  // 🚀 FIXED: Use Firebase's native authStateReady() and bypass SSR
  async waitForAuth(): Promise<User | null> {
    // 1. If Angular is rendering this on the server (SSR), bypass the check.
    // The server has no IndexedDB, so it will always return null and log you out.
    // By returning a dummy object (or true in the guard), we let the browser handle the real check.
    if (!isPlatformBrowser(this.platformId)) {
      return this.currentUser; // Will be null, but we'll handle this in the guard if needed
    }

    // 2. Wait for Firebase to completely finish reading from IndexedDB
    await auth.authStateReady();
    return auth.currentUser;
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
      return cred; 
    }

    // 2. Check if they are a Teacher
    const teacherSnap = await getDoc(doc(db, 'teachers', uid));
    if (teacherSnap.exists()) return cred; 

    // 3. Check if they are a Subject Teacher
    const subjectTeacherSnap = await getDoc(doc(db, 'subjectTeachers', uid));
    if (subjectTeacherSnap.exists()) return cred; 

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