'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { withRetry } from '@/lib/firestore-utils';

/**
 * Initiates a setDoc operation with exponential backoff.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  withRetry(() => setDoc(docRef, data, options)).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data,
      })
    )
  })
}


/**
 * Initiates an addDoc operation with exponential backoff.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = withRetry(() => addDoc(colRef, data))
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      )
    });
  return promise;
}


/**
 * Initiates an updateDoc operation with exponential backoff.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  withRetry(() => updateDoc(docRef, data))
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      )
    });
}


/**
 * Initiates a deleteDoc operation with exponential backoff.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  withRetry(() => deleteDoc(docRef))
    .catch(error => {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      )
    });
}
