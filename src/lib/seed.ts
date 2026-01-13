
'use server';

import { getFirestore, writeBatch, collection, doc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { sampleQuestions } from './data';

// IMPORTANT: This is a server-side function and should only be called from a Server Action.
export async function seedQuestions() {
  // Initialize Firebase for server-side operations
  let firebaseApp;
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
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
    await batch.commit();
    console.log(`${sampleQuestions.length} questions have been successfully seeded to Firestore.`);
    return { success: true, count: sampleQuestions.length };
  } catch (error) {
     // Server-side error logging
     const errorMessage = `Firestore Permission Denied during seeding: The request to create documents in the 'questions' collection was denied. Please check your firestore.rules.`;
     console.error(errorMessage, error);
     return { success: false, error: errorMessage };
  }
}

