import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { filter, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<User | null>(null);
  user$ = this._user$.asObservable();

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

  /**
   * Wait for auth to be initialized before returning user
   * Use this in guards to ensure Firebase has finished checking stored sessions
   */
  async waitForAuth(): Promise<User | null> {
    console.log('[AuthService] waitForAuth called');

    // If we already have a user (or confirmed it's null), return it
    if (this._user$.value !== null) {
      console.log('[AuthService] User already available:', this._user$.value?.uid ?? 'null');
      return this._user$.value;
    }

    // Wait for the first emission (Firebase checking stored session)
    try {
      console.log('[AuthService] Waiting for first auth state emission...');
      const user = await firstValueFrom(this._user$.pipe(take(1)));
      console.log('[AuthService] Auth initialized, user:', user?.uid ?? 'null');
      return user;
    } catch (e) {
      console.error('[AuthService] Error waiting for auth:', e);
      return null;
    }
  }

  login(email: string, password: string) {
    console.log('[AuthService] Logging in user:', email);
    return signInWithEmailAndPassword(auth, email, password);
  }

  logout() {
    console.log('[AuthService] Logging out');
    return signOut(auth);
  }
}