
'use client';
import {
  collection,
  onSnapshot,
  query,
  where,
  type CollectionReference,
  type DocumentData,
  type Query,
  type QueryConstraint,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFirestore } from '..';

export function useCollection<T>(
  path: string,
  ...queryConstraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;

    try {
      const collectionRef = collection(
        firestore,
        path,
      ) as CollectionReference<T>;
      const q = query(collectionRef, ...queryConstraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map(
            (doc) =>
              ({
                ...doc.data(),
                id: doc.id,
              }) as T,
          );
          setData(docs);
          setIsLoading(false);
        },
        (err) => {
          setError(err);
          setIsLoading(false);
          console.error(`Error fetching collection ${path}:`, err);
        },
      );
      return () => unsubscribe();
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
      console.error(`Error setting up collection listener for ${path}:`, err);
    }
  }, [firestore, path, ...queryConstraints.map(c => c.toString())]);

  return { data, isLoading, error };
}
