
'use server';

import { getFirestore, writeBatch, collection, doc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { sampleQuestions } from './data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// IMPORTANT: This is a server-side function and should only be called from a Server Action.
export async function seedQuestions() {
  // Initialize Firebase for server-side operations
  const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(firebaseApp);
  
  const batch = writeBatch(firestore);
  const questionsCollectionRef = collection(firestore, 'questions');

  sampleQuestions.forEach((question) => {
    const docId = String(question.id);
    const docRef = doc(questionsCollectionRef, docId);
    const firestoreQuestion = {
        id: docId,
        category: question.category,
        difficulty: question.difficulty,
        question: question.question,
        choices: question.choices,
        answer: question.answer,
        explanation: question.explanation || '',
    };
    batch.set(docRef, firestoreQuestion);
  });

  try {
    // The batch.commit() is what actually performs the writes.
    // We will catch errors here to provide context.
    await batch.commit();
    console.log(`${sampleQuestions.length} questions have been successfully seeded to Firestore.`);
    return { success: true, count: sampleQuestions.length };
  } catch (error) {
     // Even though this is a server action, we can't easily get the permission error
     // to the client's dev overlay. We log it here for server-side debugging.
     // The core issue is that batch writes don't provide granular per-document failure reasons in the catch block.
     // A more robust solution for debugging would be to write documents individually,
     // but that is much less efficient. We will assume a general 'write' failure on the collection.
    const permissionError = new FirestorePermissionError({
        path: 'questions', // Path of the collection we are writing to
        operation: 'create', // We are creating documents
        requestResourceData: { note: `Batch write for ${sampleQuestions.length} documents.` }
    });

    // We can't use the client-side emitter here, but we can return a structured error.
    console.error("Seeding failed:", permissionError.message);
    return { success: false, error: permissionError.message };
  }
}
