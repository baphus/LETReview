/**
 * Executes a Firestore operation with exponential backoff and jitter.
 * Specifically targets 429 (Rate Exceeded/Resource Exhausted) errors.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let delay = 500; // Start with 500ms
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      // Identify rate-limit related errors
      const isRateLimit = 
        error?.code === 'resource-exhausted' || 
        error?.code === 'failed-precondition' || 
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('Rate Exceeded') ||
        error?.message?.includes('quota');

      if (isRateLimit && i < maxRetries - 1) {
        // Calculate delay: exponential backoff + jitter
        const jitter = Math.random() * 100;
        const totalDelay = delay + jitter;
        
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
        
        delay *= 2; // Increase delay for next attempt
        continue;
      }
      
      // If it's not a rate limit or we're out of retries, throw the error
      throw error;
    }
  }
  return fn(); // Final attempt
}
