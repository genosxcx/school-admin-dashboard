import { Component, ChangeDetectorRef, inject } from '@angular/core';
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

@Component({
  selector: 'app-superadmin-requests',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './superadmin-requests.html',
  styleUrls: ['./superadmin-requests.scss'],
})
export class SuperadminRequests {
  private svc = inject(SuperadminService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';
  requests: PrincipalRequest[] = [];

  async ngOnInit() {
    this.loading = true;
    this.cdr.detectChanges();

    // ✅ wait for Firebase to restore auth session
    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub();
        resolve();
      });
    });

    await this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    try {
      console.log('Current user:', auth.currentUser?.email);
      this.requests = await this.svc.listRequests();
      console.log('Loaded requests:', this.requests);
    } catch (e: any) {
      console.error('Failed to load requests', e);
      this.error = e?.message ?? 'Failed to load requests';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // ✅ force UI update
    }
  }

  async approve(r: PrincipalRequest) {
    this.error = '';
    try {
const schoolId = await this.svc.approveRequest(r.id, r.uid);
      r.status = 'APPROVED';
      r.schoolId = schoolId;
      this.cdr.detectChanges();
    } catch (e: any) {
      this.error = e?.message ?? 'Approve failed';
      await this.load();
    }
  }

  async reject(r: PrincipalRequest) {
    this.error = '';
    try {
      await this.svc.rejectRequest(r.id);
      r.status = 'REJECTED';
      this.cdr.detectChanges();
    } catch (e: any) {
      this.error = e?.message ?? 'Reject failed';
      await this.load();
    }
  }
}