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

@Component({
  selector: 'app-superadmin-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './superadmin-requests.html',
  styleUrls: ['./superadmin-requests.scss'],
})
export class SuperadminRequests implements OnInit {
  private svc = inject(SuperadminService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';
  requests: PrincipalRequest[] = [];

  ngOnInit(): void {
    this.initializeAuth();
  }

  /**
   * Wait for Firebase auth to initialize
   */
  private async initializeAuth(): Promise<void> {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      // ✅ Wait for Firebase to restore auth session
      await new Promise<void>((resolve) => {
        const unsub = onAuthStateChanged(auth, () => {
          unsub();
          resolve();
        });
      });

      // Load requests after auth is ready
      await this.load();
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.error = 'Failed to initialize authentication';
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Load principal requests from service
   */
  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      console.log('Current user:', auth.currentUser?.email);

      // Fetch requests from service
      this.requests = await this.svc.listRequests();

      // Sort: pending first, then approved, then rejected
      this.requests.sort((a, b) => {
        const statusOrder: { [key: string]: number } = {
          PENDING: 0,
          APPROVED: 1,
          REJECTED: 2,
        };
        return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      });

      console.log('Loaded requests:', this.requests);

      if (this.requests.length === 0) {
        console.log('No requests found');
      }
    } catch (error: any) {
      console.error('Failed to load requests:', error);
      this.error =
        error?.message ?? 'Failed to load requests. Please try again.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // ✅ Force UI update
    }
  }

  /**
   * Approve a principal request
   */
  async approve(request: PrincipalRequest): Promise<void> {
    this.error = '';

    try {
      // Call service to approve
      const schoolId = await this.svc.approveRequest(
        request.id,
        request.uid
      );

      // Update local state
      request.status = 'APPROVED';
      request.schoolId = schoolId;

      this.cdr.detectChanges();

      // Re-sort list
      this.requests.sort((a, b) => {
        const statusOrder: { [key: string]: number } = {
          PENDING: 0,
          APPROVED: 1,
          REJECTED: 2,
        };
        return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      });

      console.log('Request approved:', request.id, 'School ID:', schoolId);
    } catch (error: any) {
      console.error('Approve failed:', error);
      this.error = error?.message ?? 'Failed to approve request. Please try again.';

      // Reload on error to sync state
      await this.load();
    }
  }

  /**
   * Reject a principal request
   */
  async reject(request: PrincipalRequest): Promise<void> {
    this.error = '';

    try {
      // Call service to reject
      await this.svc.rejectRequest(request.id);

      // Update local state
      request.status = 'REJECTED';

      this.cdr.detectChanges();

      // Re-sort list
      this.requests.sort((a, b) => {
        const statusOrder: { [key: string]: number } = {
          PENDING: 0,
          APPROVED: 1,
          REJECTED: 2,
        };
        return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      });

      console.log('Request rejected:', request.id);
    } catch (error: any) {
      console.error('Reject failed:', error);
      this.error = error?.message ?? 'Failed to reject request. Please try again.';

      // Reload on error to sync state
      await this.load();
    }
  }
}