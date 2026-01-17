
'use server';

import { getFirestore, writeBatch, doc, collection } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import reviewersSeed from '../../docs/reviewers-seed.json';
import subjectsSeed from '../../docs/subjects-seed.json';
import topicsSeed from '../../docs/topics-seed.json';
import questionsSeed from '../../docs/questions-seed.json';
import { Reviewer, QuizQuestion } from './types';

/**
 * A server-side utility to seed the database with initial content.
 * This can be triggered from a client component (e.g., a button in an admin/profile section).
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

  // Seed Subjects
  const subjectsCollectionRef = collection(firestore, 'subjects');
  subjectsSeed.forEach((subject) => {
    const subjectDocRef = doc(subjectsCollectionRef, subject.id);
    batch.set(subjectDocRef, subject);
  });

  // Seed Topics
  const topicsCollectionRef = collection(firestore, 'topics');
  topicsSeed.forEach((topic) => {
    const topicDocRef = doc(topicsCollectionRef, topic.id);
    batch.set(topicDocRef, topic);
  });

  // Seed Reviewers
  const reviewersCollectionRef = collection(firestore, 'reviewers');
  reviewersSeed.forEach((reviewer) => {
    const reviewerDocRef = doc(reviewersCollectionRef, reviewer.id);
    const data = { ...reviewer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    batch.set(reviewerDocRef, data);
  });
  
  // Seed Questions
  const questionsCollectionRef = collection(firestore, 'questions');
  
  const questionsByCategory = questionsSeed.reduce((acc, q) => {
    const question = q as QuizQuestion;
    if (question.category) {
        if (!acc[question.category]) {
            acc[question.category] = [];
        }
        acc[question.category].push(question);
    }
    return acc;
  }, {} as Record<string, QuizQuestion[]>);

  // Create one document per category that has questions
  for (const category in questionsByCategory) {
    if (questionsByCategory[category].length > 0) {
      const categoryDocRef = doc(questionsCollectionRef, category);
      batch.set(categoryDocRef, { questions: questionsByCategory[category] });
    }
  }

  try {
    await batch.commit();
    const totalCount = reviewersSeed.length + subjectsSeed.length + topicsSeed.length + Object.keys(questionsByCategory).length;
    console.log(`${totalCount} documents have been successfully seeded across all collections.`);
    return { success: true, count: totalCount };
  } catch (error) {
     const errorMessage = `Firestore seeding failed.`;
     console.error(errorMessage, error);
     return { success: false, error: errorMessage };
  }
}
