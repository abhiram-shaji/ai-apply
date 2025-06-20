# AI Apply

This tool automates LinkedIn Easy Apply flows using Playwright and OpenAI.

## Setup

1. Install dependencies with `npm install`.
2. Create a `.env` file with:
   - `OPENAI_API_KEY` – your OpenAI API key.
   - `RESUME_PATH` – absolute or relative path to your resume PDF.
   - `DELAY_MS` (optional) – delay between actions in milliseconds.
3. Run the script using `node index.js` or `npm start`.

The application log will be stored in `job-log.json`.
