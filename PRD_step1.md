# PRD Step 1: Refrigerator Image Recognition

## Overview

Step 1 builds the first user-facing workflow: upload or capture a refrigerator photo, send it to OpenRouter, and extract likely ingredients from the image.

The image recognition model is `google/gemma-3-27b-it:free`.

## Goals

- Let users submit one refrigerator image from desktop or mobile.
- Identify visible food ingredients, packaged items, and approximate quantities when possible.
- Return structured ingredient data that Step 2 can use for recipe generation.
- Keep the OpenRouter API key server-side only.

## Non-Goals

- Do not generate recipes in this step.
- Do not require user login in this step.
- Do not permanently store uploaded images unless a later step explicitly enables it.
- Do not guarantee exact nutrition, expiration date, or freshness detection from image alone.

## Target Users

- Home users who want meal ideas based on what is currently in their refrigerator.
- Users who prefer taking a photo instead of manually typing ingredients.

## User Flow

1. User opens the app landing page.
2. User uploads or captures a refrigerator image.
3. App previews the selected image.
4. User clicks "Analyze Ingredients".
5. Backend sends the image to OpenRouter using `google/gemma-3-27b-it:free`.
6. App displays detected ingredients with confidence and editable labels.
7. User can confirm, remove, or edit ingredients before moving to Step 2.

## Functional Requirements

- The app must support common image formats: JPG, PNG, and WebP.
- The frontend must validate file type and size before upload.
- The backend must convert the image to an OpenRouter-compatible image input.
- The backend must call OpenRouter through `https://openrouter.ai/api/v1/chat/completions`.
- The model prompt must request structured JSON output.
- The UI must show loading, success, and error states.
- Users must be able to edit the detected ingredient list.
- The app must not expose `OPENROUTER_API_KEY` to the browser.

## Suggested Model Prompt Contract

The backend should ask the model to identify visible refrigerator ingredients and respond with JSON only:

```json
{
  "ingredients": [
    {
      "name": "egg",
      "category": "protein",
      "quantity_estimate": "6",
      "unit": "pieces",
      "confidence": 0.84,
      "notes": "visible in carton"
    }
  ],
  "uncertain_items": [
    {
      "description": "green leafy vegetable in plastic bag",
      "reason": "label is not visible"
    }
  ]
}
```

## API Requirements

### `POST /api/recognize-image`

Request:

- `multipart/form-data`
- Field: `image`

Response:

```json
{
  "ingredients": [],
  "uncertain_items": [],
  "model": "google/gemma-3-27b-it:free"
}
```

Error cases:

- `400`: missing image, unsupported format, or image too large
- `429`: OpenRouter or upstream provider rate limit
- `500`: unexpected server error
- `502`: invalid or unusable model response

## Data Requirements

Ingredient object:

- `name`: normalized ingredient name
- `category`: broad food category
- `quantity_estimate`: approximate visible quantity
- `unit`: unit when identifiable
- `confidence`: number from `0` to `1`
- `notes`: short explanation

## UX Requirements

- Show image preview before analysis.
- Display detected ingredients as editable chips or rows.
- Mark low-confidence items visually.
- Provide a retry option when OpenRouter returns a rate limit or provider error.
- Warn users that results are AI estimates and should be reviewed.

## Security and Privacy

- Store `OPENROUTER_API_KEY` in `.env` only.
- Do not log raw images, base64 image data, or API keys.
- Limit upload size to reduce cost and abuse.
- Strip image metadata before forwarding when practical.

## Success Metrics

- At least 90% of valid test images receive a structured response.
- Users can complete image upload and ingredient review in under 60 seconds.
- Less than 5% of model responses fail JSON parsing after retry or repair handling.

## Acceptance Criteria

- A user can upload a refrigerator image and receive a visible ingredient list.
- The request uses `google/gemma-3-27b-it:free`.
- The API key never appears in frontend code or network responses.
- The ingredient result can be edited before recipe generation.
