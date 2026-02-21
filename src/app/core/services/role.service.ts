import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter, take, timeout } from 'rxjs/operators';
import { onAuthStateChanged, getIdTokenResult, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export type RoleClaims = {
  uid: string;
  email?: string | null;
  schoolId?: string;
  role?: string;
  classIds?: string[];
};

@Injectable({ providedIn: 'root' })
export class RoleService {
  private _claims = new BehaviorSubject<RoleClaims | null>(null);
  claims$ = this._claims.asObservable();

  private loading = false; // prevent double-load spam

  constructor() {
    console.log('[RoleService] Service initialized');

    onAuthStateChanged(auth, (user) => {
      console.log('[RoleService] onAuthStateChanged fired, user exists:', !!user);

      if (!user) {
        this._claims.next(null);
        return;
      }

      // Only load once per session unless you explicitly refresh
      this.loadClaimsForUser(user).catch((e) =>
        console.error('[RoleService] loadClaimsForUser error:', e)
      );
    });
  }

  get claims(): RoleClaims | null {
    return this._claims.value;
  }

  /**
   * Components/guards should ONLY call this.
   * It will wait until auth is ready AND claims are loaded.
   */
  async getClaims(): Promise<RoleClaims> {
    // Already loaded
    if (this._claims.value) return this._claims.value;

    // If auth already has a user but claims weren't loaded yet, trigger loading here too.
    const user = auth.currentUser;
    if (user && !this.loading) {
      await this.loadClaimsForUser(user);
    }

    // Wait for claims from stream (with timeout so you don't hang forever)
    const claims = await firstValueFrom(
      this._claims.pipe(
        filter((c): c is RoleClaims => c !== null),
        take(1),
        timeout(8000)
      )
    );

    return claims;
  }

  private async loadClaimsForUser(user: User): Promise<void> {
    if (!user?.uid) {
      console.warn('[RoleService] loadClaimsForUser called with invalid user');
      this._claims.next(null);
      return;
    }

    // prevent duplicate loads
    if (this.loading) return;
    this.loading = true;

    try {
      const claims = await this.loadClaims(user);
      this._claims.next(claims);
    } catch (error) {
      console.error('[RoleService] loadClaimsForUser failed:', error);
      this._claims.next(null);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  private async loadClaims(user: User): Promise<RoleClaims> {
    if (!user?.uid) throw new Error('User object is invalid');

    // 1) Custom token claims
    try {
      const token = await getIdTokenResult(user, true);
      const c: any = token?.claims ?? {};
      const schoolId = c['schoolId'];

      if (schoolId) {
        return {
          uid: user.uid,
          email: user.email,
          schoolId,
          role: c['role'],
          classIds: c['classIds'] ?? [],
        };
      }
    } catch (e) {
      console.warn('[RoleService] Custom claims failed:', e);
    }

    // 2) Firestore fallback
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      return { uid: user.uid, email: user.email, schoolId: '', role: '', classIds: [] };
    }

    const data = snap.data() as any;
    return {
      uid: user.uid,
      email: user.email ?? data?.email,
      schoolId: data?.schoolId ?? '',
      role: data?.role ?? '',
      classIds: data?.classIds ?? [],
    };
  }
}