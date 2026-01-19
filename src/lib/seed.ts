
'use server';

/**
 * This server-side utility is deprecated.
 * The seeding logic has been moved to a client-side function
 * in `src/app/profile/page.tsx` to ensure it runs with the
 * authenticated user's permissions.
 */
export async function seedDatabase() {
  console.warn("`seedDatabase` from `lib/seed.ts` is deprecated. The logic has been moved to the client.");
  return { success: false, error: "This function is deprecated." };
}
