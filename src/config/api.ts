// API Configuration
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

// Note: API key is now loaded from environment variables (.env.local file)
// Make sure to add .env.local to .gitignore to keep your API key secure