import { Component, inject, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
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

// ✅ Translate
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { DataService, SchoolClass } from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';
import { ClassFormDialog } from './class-form-dialog/class-form-dialog';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatTableModule, MatIconModule, MatButtonModule,
    TranslatePipe // ✅ Added Pipe
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
  private translate = inject(TranslateService); // ✅ Injected
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
            this.error = this.translate.instant('CLASSES.MESSAGES.ERROR_CLAIMS');
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
        this.error = this.translate.instant('CLASSES.MESSAGES.ERROR_LOAD');
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async addClass() {
    if (!this.schoolId) return;

    const ref = this.dialog.open(ClassFormDialog, {
      width: '420px',
      data: { title: this.translate.instant('CLASSES.ADD') }, // ✅ Translate here
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
      this.zone.run(() => (this.error = this.translate.instant('CLASSES.MESSAGES.ERROR_CREATE')));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  async editClass(c: SchoolClass) {
    if (!c.id) return;

    const ref = this.dialog.open(ClassFormDialog, {
      width: '420px',
      data: { 
        title: this.translate.instant('CLASSES.TABLE.ACTIONS'), // Or a custom translation key
        initialName: c.name 
      },
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
      this.zone.run(() => (this.error = this.translate.instant('CLASSES.MESSAGES.ERROR_UPDATE')));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  async deleteClass(c: SchoolClass) {
    if (!c.id) return;

    const msg = this.translate.instant('CLASSES.MESSAGES.DELETE_CONFIRM');
    const ok = confirm(`${msg} "${c.name}"?`);
    if (!ok) return;

    this.zone.run(() => (this.loading = true));
    this.cdr.detectChanges();

    try {
      await this.data.deleteClass(c.id);
      await this.loadClasses();
    } catch (e) {
      console.error(e);
      this.zone.run(() => (this.error = this.translate.instant('CLASSES.MESSAGES.ERROR_DELETE')));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  

  exportToCSV() {
    if (this.filtered.length === 0) return;

    // Define headers
    const headers = ['Class Name'];
    
    // Map rows
    const rows = this.filtered.map(c => [
      `"${c.name || 'Unnamed Class'}"`
    ]);

    // Create CSV content with BOM for Excel UTF-8 support
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `classes_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
