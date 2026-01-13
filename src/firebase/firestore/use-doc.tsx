'use client';
import {
  doc,
  onSnapshot,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useFirestore } from '..';

export function useDoc<T>(path: string, id: string | undefined) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore || !id) {
        setIsLoading(false);
        setData(null);
        return;
    };
    
    try {
      const docRef = doc(firestore, path, id) as DocumentReference<T>;
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setData({ ...docSnap.data(), id: docSnap.id });
          } else {
            setData(null);
          }
          setIsLoading(false);
        },
        (err) => {
          setError(err);
          setIsLoading(false);
          console.error(`Error fetching document ${path}/${id}:`, err);
        },
      );
      return () => unsubscribe();
    } catch (err) {
        setError(err as Error);
        setIsLoading(false);
        console.error(`Error setting up doc listener for ${path}/${id}:`, err);
    }
  }, [firestore, path, id]);

  return { data, isLoading, error };
}
