"use client";

import { useEffect, useState, type ReactNode } from "react";
import { initializeFirebase, FirebaseProvider } from ".";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

interface Props {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: Props) {
  const [instances, setInstances] = useState<{
    app: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !instances) {
      setInstances(initializeFirebase());
    }
  }, [instances]);

  if (!instances) {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider
      app={instances.app}
      auth={instances.auth}
      firestore={instances.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
