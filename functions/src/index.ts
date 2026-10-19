import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const PRINCIPAL_ROLES = ['principal', 'admin'];
const CLASS_ROLES = ['teacher', 'subject_teacher', 'parent'];
const MANAGED_BY_PRINCIPAL = ['teacher', 'subject_teacher', 'student'];

type SetUserPasswordRequest = { uid?: string; newPassword?: string };

function classIdsOf(data: FirebaseFirestore.DocumentData): string[] {
  const ids = Array.isArray(data['classIds']) ? data['classIds'].map(String) : [];
  if (data['classId']) ids.push(String(data['classId']));
  return ids.filter(Boolean);
}

/**
 * Checks that the signed-in caller manages the target account and returns the db.
 * - Principals/admins: any teacher, subject teacher or student in their school.
 * - Teachers/subject teachers/parents: students in one of their classes.
 */
async function assertCanManage(callerUid: string, uid: string) {
  const db = getFirestore();
  const [callerSnap, targetSnap] = await Promise.all([
    db.doc(`users/${callerUid}`).get(),
    db.doc(`users/${uid}`).get(),
  ]);
  if (!callerSnap.exists || !targetSnap.exists) {
    throw new HttpsError('permission-denied', 'You are not allowed to manage this account.');
  }

  const caller = callerSnap.data()!;
  const target = targetSnap.data()!;
  const callerRole = (caller['role'] ?? '').toString().toLowerCase();
  const targetRole = (target['role'] ?? '').toString().toLowerCase();
  const sameSchool = !!caller['schoolId'] && caller['schoolId'] === target['schoolId'];

  let allowed = false;
  if (sameSchool && PRINCIPAL_ROLES.includes(callerRole)) {
    allowed = MANAGED_BY_PRINCIPAL.includes(targetRole);
  } else if (sameSchool && CLASS_ROLES.includes(callerRole) && targetRole === 'student') {
    allowed = classIdsOf(caller).includes((target['classId'] ?? '').toString());
  }
  if (!allowed) {
    throw new HttpsError('permission-denied', 'You are not allowed to manage this account.');
  }
  return db;
}

/**
 * Lets staff set a new password on an account they manage. The client SDK can only
 * change the signed-in user's own password, so this runs with the Admin SDK.
 */
export const setUserPassword = onCall<SetUserPasswordRequest>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'You must be signed in.');

  const uid = (request.data?.uid ?? '').toString().trim();
  const newPassword = (request.data?.newPassword ?? '').toString();
  if (!uid) throw new HttpsError('invalid-argument', 'Missing user id.');
  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }

  await assertCanManage(callerUid, uid);

  try {
    await getAuth().updateUser(uid, { password: newPassword });
  } catch (e: any) {
    if (e?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'This person has no login account.');
    }
    throw new HttpsError('internal', 'Could not update the password.');
  }

  return { ok: true };
});

/**
 * Deletes a teacher/student's Firestore profile and their Firebase Auth login, so the
 * email can be used again. The client SDK can't delete other users' Auth accounts.
 */
export const deleteUserAccount = onCall<{ uid?: string }>(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'You must be signed in.');

  const uid = (request.data?.uid ?? '').toString().trim();
  if (!uid) throw new HttpsError('invalid-argument', 'Missing user id.');
  if (uid === callerUid) throw new HttpsError('permission-denied', 'You cannot delete yourself.');

  const db = await assertCanManage(callerUid, uid);

  try {
    await getAuth().deleteUser(uid);
  } catch (e: any) {
    // Profiles created without a password never had an Auth account.
    if (e?.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', 'Could not delete the login account.');
    }
  }
  await db.doc(`users/${uid}`).delete();

  return { ok: true };
});
