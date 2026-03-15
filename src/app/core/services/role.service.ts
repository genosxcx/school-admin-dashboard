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
  status?: string; // Tracks 'APPROVED' vs 'PENDING'
  classIds?: string[];
  classId?: string;
};

@Injectable({ providedIn: 'root' })
export class RoleService {
  private _claims = new BehaviorSubject<RoleClaims | null>(null);
  claims$ = this._claims.asObservable();

  private loading = false;

  constructor() {
    console.log('[RoleService] Service initialized');

    onAuthStateChanged(auth, (user) => {
      console.log('[RoleService] onAuthStateChanged fired, user exists:', !!user);

      if (!user) {
        this._claims.next(null);
        return;
      }

      this.loadClaimsForUser(user).catch((e) =>
        console.error('[RoleService] loadClaimsForUser failed:', e)
      );
    });
  }

  get claims(): RoleClaims | null {
    return this._claims.value;
  }

  async getClaims(): Promise<RoleClaims> {
    if (this._claims.value) return this._claims.value;

    const user = auth.currentUser;
    if (user && !this.loading) {
      await this.loadClaimsForUser(user);
    }

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
      this._claims.next(null);
      return;
    }

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

    // 1) Start with default values, including an empty status
    let base: RoleClaims = {
      uid: user.uid,
      email: user.email,
      schoolId: '',
      role: '',
      status: '',
      classIds: [],
      classId: '',
    };

    try {
      const token = await getIdTokenResult(user, true); // force refresh
      const c: any = token?.claims ?? {};

      base = {
        ...base,
        schoolId: (c['schoolId'] ?? base.schoolId ?? '').toString(),
        role: (c['role'] ?? base.role ?? '').toString(),
        status: (c['status'] ?? base.status ?? '').toString(),
        classIds: Array.isArray(c['classIds']) ? c['classIds'] : base.classIds,
        classId: (c['classId'] ?? base.classId ?? '').toString(),
      };
    } catch (e) {
      console.warn('[RoleService] Custom claims failed:', e);
    }

    // 2) Merge with Firestore user doc to fetch the latest status
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as any;

        return {
          ...base,
          email: base.email ?? data?.email ?? null,
          schoolId: base.schoolId || (data?.schoolId ?? ''),
          role: base.role || (data?.role ?? ''),
          status: base.status || (data?.status ?? ''), 
          classIds: (base.classIds?.length ? base.classIds : (data?.classIds ?? [])),
          classId: base.classId || (data?.classId ?? ''),
        };
      }

      return base;
    } catch (e) {
      console.error('[RoleService] Firestore lookup failed:', e);
      return base; 
    }
  }
}