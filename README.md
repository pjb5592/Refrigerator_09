# Refrigerator_09
Author: 변중배, Reviewer: 김정용, 남원희, 박성준, 송성훈, 김대경, 최혁성

## Environment Setup

This project expects secrets to be stored locally in `.env`.

1. Copy `.env.example` to `.env`.
2. Replace `your_openrouter_api_key_here` with your OpenRouter API key.
3. Do not commit `.env` or paste the API key into client-side code, logs, screenshots, or prompts.

Optional model overrides:

```bash
OPENROUTER_IMAGE_MODEL=google/gemma-3-27b-it:free
OPENROUTER_RECIPE_MODEL=deepseek/deepseek-chat-v3.1:free
```

## OpenRouter Key Safety

- Keep `OPENROUTER_API_KEY` server-side only.
- Use the key through environment variables, not hard-coded strings.
- If the key is ever committed, shared, or shown in an unsafe place, revoke it in OpenRouter and create a new one.
- When building a frontend app, call your own backend endpoint instead of calling OpenRouter directly from the browser.

## Run Step 1 App

Install dependencies:

```bash
npm install
```

Start the local web app:

```bash
npm start
```

Open `http://localhost:3000`.

- Step 1 sends the image to OpenRouter with `google/gemma-3-27b-it:free` and returns editable ingredient results.
- Step 2 sends confirmed ingredients to OpenRouter with `deepseek/deepseek-chat-v3.1:free` and returns recipe cards.
- Step 3 stores a local development profile and saved recipes in `data/app-data.json`.

## Local Test Commands

Health check:

```bash
curl http://localhost:3000/api/health
```

Recipe generation test:

```bash
curl -X POST http://localhost:3000/api/generate-recipes \
  -H "Content-Type: application/json" \
  -d '{"ingredients":[{"name":"egg","category":"protein","quantity_estimate":"2","unit":"pieces"},{"name":"rice","category":"grain","quantity_estimate":"1","unit":"bowl"}],"preferences":{"cuisine":"Korean","meal_type":"dinner","max_cooking_time_minutes":30,"dietary_restrictions":[],"allergies":[],"disliked_ingredients":[],"servings":2}}'
```

Profile and saved recipe test:

```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","display_name":"Home Cook","preferences":{"preferred_cuisines":["Korean"],"dietary_restrictions":[],"allergies":[],"disliked_ingredients":[],"default_servings":2,"max_cooking_time_minutes":30}}'
```

## Isolated Local Environment

This project uses Node.js with project-local `node_modules`, so a Python-style virtual environment is not required. For an isolated local run, use a fresh clone or folder and run:

```bash
npm ci
npm start
```
