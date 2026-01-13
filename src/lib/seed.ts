'use server';

import { getFirestore, writeBatch, collection, doc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { sampleQuestions } from './data';

// IMPORTANT: This is a server-side function and should only be called from a Server Action.
export async function seedQuestions() {
  // Initialize Firebase Admin SDK for server-side operations
  const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(firebaseApp);
  
  // Use a batch to write all documents at once for efficiency.
  const batch = writeBatch(firestore);

  sampleQuestions.forEach((question) => {
    // Convert the numeric ID to a string for the document ID in Firestore.
    const docId = String(question.id);
    const docRef = doc(firestore, 'questions', docId);

    // Create a new object for Firestore, ensuring all fields match the target schema.
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
    await batch.commit();
    console.log(`${sampleQuestions.length} questions have been successfully seeded to Firestore.`);
    return { success: true, count: sampleQuestions.length };
  } catch (error) {
    console.error("Error seeding questions:", error);
    return { success: false, error: (error as Error).message };
  }
}
