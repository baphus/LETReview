
'use server';

import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import allQuestions from '../../docs/questions-seed.json';
import type { QuizQuestion } from './types';

// This file is no longer used for seeding from the client.
// It can be used for server-side scripts if needed in the future.
// The primary seeding functionality has been removed from the UI.

/**
 * A server-side utility to seed the database.
 * This is not exposed to the client.
 */
export async function seedDatabase() {
  let firebaseApp;
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  const firestore = getFirestore(firebaseApp);
  
  const batch = writeBatch(firestore);
  const questionsCollectionRef = doc(firestore, 'questions');

  const categorizedQuestions = allQuestions.reduce((acc, question) => {
    const category = question.category as 'gen_education' | 'professional';
    const targetCategory = category === 'gen_education' ? 'gened' : 'profed';
    
    if (!acc[targetCategory]) {
      acc[targetCategory] = [];
    }
    const questionWithStrId: QuizQuestion = {
        ...question,
        id: String(question.id)
    };
    acc[targetCategory].push(questionWithStrId);
    return acc;
  }, {} as Record<'gened' | 'profed', QuizQuestion[]>);

  for (const category in categorizedQuestions) {
    if (Object.prototype.hasOwnProperty.call(categorizedQuestions, category)) {
      const categoryId = category as 'gened' | 'profed';
      const categoryDocRef = doc(questionsCollectionRef, categoryId);
      batch.set(categoryDocRef, { questions: categorizedQuestions[categoryId] });
    }
  }

  try {
    await batch.commit();
    const count = allQuestions.length;
    console.log(`${count} questions have been successfully seeded.`);
    return { success: true, count: count };
  } catch (error) {
     const errorMessage = `Firestore seeding failed.`;
     console.error(errorMessage, error);
     return { success: false, error: errorMessage };
  }
}
