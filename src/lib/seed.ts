
'use server';

import { getFirestore, writeBatch, doc, collection } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import allQuestions from '../../docs/questions-seed.json';
import type { QuizQuestion } from './types';

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

  // Group questions by category
  const categorizedQuestions = allQuestions.reduce((acc, question) => {
    const category = question.category as 'gen_education' | 'professional';
    const targetCategory = category === 'gen_education' ? 'gened' : 'profed';
    
    if (!acc[targetCategory]) {
      acc[targetCategory] = [];
    }
    // Ensure id is a string
    const questionWithStrId: QuizQuestion = {
        ...question,
        id: String(question.id)
    };
    acc[targetCategory].push(questionWithStrId);
    return acc;
  }, {} as Record<'gened' | 'profed', QuizQuestion[]>);

  // Set up a batch write for each category document
  for (const category in categorizedQuestions) {
    if (Object.prototype.hasOwnProperty.call(categorizedQuestions, category)) {
      const categoryId = category as 'gened' | 'profed';
      const categoryDocRef = doc(questionsCollectionRef, categoryId);
      batch.set(categoryDocRef, { questions: categorizedQuestions[categoryId] });
    }
  }

  try {
    // The batch.commit() is what actually performs the writes.
    await batch.commit();
    const count = allQuestions.length;
    console.log(`${count} questions have been successfully seeded into category documents.`);
    return { success: true, count: count };
  } catch (error) {
     const errorMessage = `Firestore Permission Denied during seeding: The request to write documents to the 'questions' collection was denied. Please check your firestore.rules.`;
     console.error(errorMessage, error);
     return { success: false, error: errorMessage };
  }
}

    