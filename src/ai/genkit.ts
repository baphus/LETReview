import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { ollama } from 'genkitx-ollama';

/**
 * Genkit configuration for LETReview.
 * Supports both Google AI (Gemini) and local tiny models via Ollama.
 */
export const ai = genkit({
  plugins: [
    googleAI(),
    ollama({
      serverAddress: 'http://localhost:11434',
      models: [{ name: 'phi3' }, { name: 'gemma2:2b' }],
    }),
  ],
  // Default to Gemini for cloud reliability, but we can override in specific flows
  model: googleAI.model('gemini-2.5-flash'),
});

export { z };
