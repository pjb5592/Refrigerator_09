# Refrigerator_09
Author: 변중배, Reviewer: 김정용, 남원희, 박성준, 송성훈, 김대경, 최혁성

## Environment Setup

This project expects secrets to be stored locally in `.env`.

1. Copy `.env.example` to `.env`.
2. Replace `your_openrouter_api_key_here` with your OpenRouter API key.
3. Do not commit `.env` or paste the API key into client-side code, logs, screenshots, or prompts.

## OpenRouter Key Safety

- Keep `OPENROUTER_API_KEY` server-side only.
- Use the key through environment variables, not hard-coded strings.
- If the key is ever committed, shared, or shown in an unsafe place, revoke it in OpenRouter and create a new one.
- When building a frontend app, call your own backend endpoint instead of calling OpenRouter directly from the browser.
