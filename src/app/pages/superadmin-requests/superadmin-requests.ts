import { Component, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import {
  PrincipalRequest,
  SuperadminService,
} from '../../core/services/superadmin.service';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NsLogo } from '../../shared/ns-logo/ns-logo';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs'; // ✅ Imported Tabs

@Component({
  selector: 'app-superadmin-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    NsLogo,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule, // ✅ Added to imports
  ],
  templateUrl: './superadmin-requests.html',
  styleUrls: ['./superadmin-requests.scss'],
})
export class SuperadminRequests implements OnInit {
  private svc = inject(SuperadminService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';
  
  // ✅ Separate arrays for Principals and Parents
  principalRequests: PrincipalRequest[] = [];
  parentRequests: any[] = []; 

  ngOnInit(): void {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      await new Promise<void>((resolve) => {
        const unsub = onAuthStateChanged(auth, () => {
          unsub();
          resolve();
        });
      });
      await this.load();
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.error = 'Failed to initialize authentication';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      // ✅ Fetch both concurrently; one failing list doesn't blank the other tab
      const [principals, parents] = await Promise.allSettled([
        this.svc.listRequests(),
        this.svc.listParentRequests()
      ]);

      const statusOrder: { [key: string]: number } = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
      const byStatus = (a: any, b: any) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);

      this.principalRequests = principals.status === 'fulfilled' ? principals.value.sort(byStatus) : [];
      this.parentRequests = parents.status === 'fulfilled' ? parents.value.sort(byStatus) : [];

      const failed = [principals, parents].find((r) => r.status === 'rejected');
      if (failed) throw (failed as PromiseRejectedResult).reason;

    } catch (error: any) {
      console.error('Failed to load requests:', error);
      this.error = error?.message ?? 'Failed to load requests. Please try again.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // --- PRINCIPAL ACTIONS ---
  async approvePrincipal(request: PrincipalRequest): Promise<void> {
    this.error = '';
    try {
      const schoolId = await this.svc.approveRequest(request.id, request.uid);
      request.status = 'APPROVED';
      request.schoolId = schoolId;
      this.cdr.detectChanges();
    } catch (error: any) {
      this.error = error?.message ?? 'Failed to approve. Please try again.';
      await this.load();
    }
  }

  async rejectPrincipal(request: PrincipalRequest): Promise<void> {
    this.error = '';
    try {
      await this.svc.rejectRequest(request.id);
      request.status = 'REJECTED';
      this.cdr.detectChanges();
    } catch (error: any) {
      this.error = error?.message ?? 'Failed to reject. Please try again.';
      await this.load();
    }
  }

  // --- PARENT ACTIONS ---
  async approveParent(request: any): Promise<void> {
    this.error = '';
    try {
      await this.svc.approveParent(request.id);
      request.status = 'APPROVED';
      this.cdr.detectChanges();
    } catch (error: any) {
      this.error = error?.message ?? 'Failed to approve parent. Please try again.';
      await this.load();
    }
  }

  async rejectParent(request: any): Promise<void> {
    this.error = '';
    try {
      await this.svc.rejectParent(request.id);
      request.status = 'REJECTED';
      this.cdr.detectChanges();
    } catch (error: any) {
      this.error = error?.message ?? 'Failed to reject parent. Please try again.';
      await this.load();
    }
  }
}