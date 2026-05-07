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

  // ✅ ADDED: A flag to track if Firebase has finished its initial load
  private isInitialized = false;

  constructor() {
    console.log('[AuthService] Initializing...');
    onAuthStateChanged(auth, (user) => {
      this.isInitialized = true; // ✅ Mark as initialized as soon as Firebase responds
      console.log('[AuthService] Auth state changed, user:', user?.uid ?? 'null');
      this._user$.next(user);
    });
  }

  get currentUser(): User | null {
    return this._user$.value;
  }

  /**
   * ✅ BULLETPROOF WAIT: Checks the flag. If Firebase is already loaded, 
   * it returns immediately. If not, it waits.
   */
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
    const snap = await getDoc(doc(db, 'users', uid));

    if (!snap.exists()) {
      await signOut(auth);
      throw new Error('Your account is pending approval.');
    }

    const data = snap.data() as any;

    if (data?.approved !== true && data?.status !== 'APPROVED') {
      await signOut(auth);
      throw new Error('Your account is pending approval.');
    }

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