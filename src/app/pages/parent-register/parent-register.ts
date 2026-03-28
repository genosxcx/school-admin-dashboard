import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // ✅ Added signOut
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

@Component({
  selector: 'app-parent-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './parent-register.html',
  styleUrls: ['./parent-register.scss'],
})
export class ParentRegister {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loading = false;
  error = '';
  success = false; // ✅ Added to show a success message

  form = this.fb.group(
    {
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator }
  );

  passwordMatchValidator(g: any) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const { fullName, email, password } = this.form.getRawValue();

      // 1. Create the Auth User
      const cred = await createUserWithEmailAndPassword(auth, email!, password!);
      const uid = cred.user.uid;

      // The Parent's UID becomes their unique family "schoolId"
      const familySchoolId = uid; 

      // 2. Save Parent Profile to Firestore with PENDING status
      await setDoc(doc(db, 'users', uid), {
        role: 'parent',
        schoolId: familySchoolId,
        fullName: fullName!.trim(),
        email: email!.trim(),
        status: 'PENDING', // ✅ Changed from APPROVED to PENDING
      });

      // 3. Create a default class for their kids
      await addDoc(collection(db, 'classes'), {
        schoolId: familySchoolId,
        name: 'My Family',
      });

      // 4. ✅ Log them out immediately so they don't bypass the pending check
      await signOut(auth);

      // 5. Show success state to the user
      this.success = true;
      this.form.reset();

      // Optional: Redirect them back to login after a few seconds
      setTimeout(() => {
        this.router.navigateByUrl('/admin/login');
      }, 4000);

    } catch (e: any) {
      console.error('[ParentRegister] error:', e);
      this.error = e.message || 'Failed to create account.';
    } finally {
      this.loading = false;
    }
  }
}