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
      // ✅ Fetch both concurrently
      const [principals, parents] = await Promise.all([
        this.svc.listRequests(),
        this.svc.listParentRequests()
      ]);

      const statusOrder: { [key: string]: number } = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

      this.principalRequests = principals.sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));
      this.parentRequests = parents.sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

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