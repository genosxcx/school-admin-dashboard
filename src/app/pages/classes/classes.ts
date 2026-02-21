import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of, firstValueFrom } from 'rxjs';
import { catchError, filter, take, takeUntil, timeout } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { DataService, SchoolClass } from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';
import { ClassFormDialog } from './class-form-dialog/class-form-dialog';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './classes.html',
  styleUrls: ['./classes.scss'],
})
export class Classes implements OnInit, OnDestroy {
  private data = inject(DataService);
  private role = inject(RoleService);
  private dialog = inject(MatDialog);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  schoolId = '';
  q = '';

  classes: SchoolClass[] = [];
  displayedColumns = ['name', 'actions'];

  get filtered(): SchoolClass[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.classes;
    return this.classes.filter((c) => (c.name ?? '').toLowerCase().includes(s));
  }

  ngOnInit(): void {
    this.zone.run(() => {
      this.loading = true;
      this.error = '';
      this.classes = [];
    });
    this.cdr.detectChanges();

    this.role.claims$
      .pipe(
        timeout(8000),
        catchError((err) => {
          console.error('[Classes] claims$ failed:', err);
          this.zone.run(() => {
            this.error = 'Could not load your school info (claims).';
            this.loading = false;
          });
          this.cdr.detectChanges();
          return of(null);
        }),
        filter((c): c is any => !!c),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe((claims) => {
        this.schoolId = claims.schoolId;
        this.loadClasses();
      });
  }

  private async loadClasses() {
    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      const res = await this.data.getClasses(this.schoolId);

      this.zone.run(() => {
        this.classes = (res ?? []).slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        this.loading = false;
      });
      this.cdr.detectChanges();
    } catch (e) {
      console.error('[Classes] loadClasses failed:', e);
      this.zone.run(() => {
        this.error = 'Failed to load classes.';
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async addClass() {
    if (!this.schoolId) return;

    const ref = this.dialog.open(ClassFormDialog, {
      width: '420px',
      data: { title: 'Add class' },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.zone.run(() => (this.loading = true));
    this.cdr.detectChanges();

    try {
      await this.data.createClass(this.schoolId, result.name);
      await this.loadClasses();
    } catch (e) {
      console.error(e);
      this.zone.run(() => (this.error = 'Failed to create class.'));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  async editClass(c: SchoolClass) {
    if (!c.id) return;

    const ref = this.dialog.open(ClassFormDialog, {
      width: '420px',
      data: { title: 'Edit class', initialName: c.name },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.zone.run(() => (this.loading = true));
    this.cdr.detectChanges();

    try {
      await this.data.updateClass(c.id, result.name);
      await this.loadClasses();
    } catch (e) {
      console.error(e);
      this.zone.run(() => (this.error = 'Failed to update class.'));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  async deleteClass(c: SchoolClass) {
    if (!c.id) return;

    const ok = confirm(`Delete class "${c.name}"?`);
    if (!ok) return;

    this.zone.run(() => (this.loading = true));
    this.cdr.detectChanges();

    try {
      await this.data.deleteClass(c.id);
      await this.loadClasses();
    } catch (e) {
      console.error(e);
      this.zone.run(() => (this.error = 'Failed to delete class.'));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
