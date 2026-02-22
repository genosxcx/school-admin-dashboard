import { Injectable } from '@angular/core';
import {
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
setDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type PrincipalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PrincipalRequest = {
  id: string; // firestore doc id
  fullName: string;
  email: string;
  uid:string;
  schoolName: string;
  status: PrincipalRequestStatus;
  createdAt?: any;
  approvedAt?: any;
  rejectedAt?: any;
  schoolId?: string;
};

@Injectable({ providedIn: 'root' })
export class SuperadminService {
  private colRef = collection(db, 'principal_requests');

    async listRequests(): Promise<PrincipalRequest[]> {
    const ref = collection(db, 'principal_requests');
    const snap = await getDocs(ref);

    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        fullName: data.fullName ?? '',
        uid: d.data()['uid'], 
        email: data.email ?? '',
        schoolName: data.schoolName ?? '',
        status: (data.status ?? 'PENDING') as PrincipalRequestStatus,
        createdAt: data.createdAt,
        schoolId: data.schoolId,
      };
    });

    // ✅ sort locally (safe even if createdAt missing)
    items.sort((a, b) => {
      const at = a.createdAt?.seconds ?? 0;
      const bt = b.createdAt?.seconds ?? 0;
      return bt - at;
    });

    return items;
  }


async approveRequest(requestId: string, uid: string) {
  const schoolId = this.makeSchoolId();

  // mark request approved
  await updateDoc(doc(db, 'principal_requests', requestId), {
    status: 'APPROVED',
    schoolId,
    approvedAt: serverTimestamp(),
  });

  // create/update user profile (unlock access)
  await setDoc(
    doc(db, 'users', uid),
    {
      role: 'PRINCIPAL',
      approved: true,
      schoolId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return schoolId;
}

  async rejectRequest(requestId: string) {
    await updateDoc(doc(db, 'principal_requests', requestId), {
      status: 'REJECTED',
      rejectedAt: serverTimestamp(),
    });
  }

  // simple readable ID (you can change format whenever)
  private makeSchoolId(): string {
    const part = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `SCH-${part}`;
  }
 async submitPrincipalRequest(payload: {
  uid: string;
  fullName: string;
  email: string;
  schoolName: string;
}) {
  const ref = collection(db, 'principal_requests');
  await addDoc(ref, {
    uid: payload.uid,
    fullName: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    schoolName: payload.schoolName.trim(),
    status: 'PENDING',
    createdAt: serverTimestamp(),
  });
}

}