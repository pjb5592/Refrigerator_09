# PRD Step 2: Recipe Recommendation

## Overview

Step 2 uses the ingredient information from Step 1 to generate practical recipe recommendations. The recipe generation model is `deepseek/deepseek-chat-v3.1:free`.

## Goals

- Generate recipes from confirmed refrigerator ingredients.
- Prioritize recipes that use ingredients already detected in Step 1.
- Provide clear cooking steps, time estimates, difficulty, and missing optional ingredients.
- Let users regenerate or refine recommendations with simple preferences.

## Non-Goals

- Do not build persistent user accounts in this step.
- Do not save recipes permanently unless Step 3 is implemented.
- Do not provide medical or professional nutrition advice.
- Do not order groceries or connect to delivery services.

## Dependencies

- Step 1 must provide a reviewed ingredient list.
- The backend must have access to `OPENROUTER_API_KEY`.
- The frontend must pass confirmed ingredients to the recipe generation endpoint.

## User Flow

1. User reviews detected ingredients from Step 1.
2. User optionally adds preferences such as cuisine, meal type, cooking time, allergies, or disliked ingredients.
3. User clicks "Recommend Recipes".
4. Backend sends ingredients and preferences to OpenRouter using `deepseek/deepseek-chat-v3.1:free`.
5. App displays several recipe cards.
6. User opens a recipe detail view.
7. User can regenerate, adjust preferences, or move to Step 3 to save recipes.

## Functional Requirements

- The app must accept the edited ingredient list from Step 1.
- The app must support optional preference inputs:
  - cuisine style
  - meal type
  - maximum cooking time
  - dietary restrictions
  - allergies
  - disliked ingredients
  - serving count
- The backend must request structured JSON output from the model.
- The backend must validate model output before sending it to the frontend.
- The UI must show at least 3 recipe recommendations when possible.
- Each recipe must identify which detected ingredients are used and which ingredients are missing.
- Users must be able to regenerate recommendations.

## Suggested Model Prompt Contract

The backend should instruct the model to generate recipes using the provided ingredients and return JSON only:

```json
{
  "recipes": [
    {
      "title": "Kimchi Egg Fried Rice",
      "summary": "A quick rice dish using eggs and leftover vegetables.",
      "used_ingredients": ["egg", "green onion", "rice"],
      "optional_missing_ingredients": ["sesame oil"],
      "required_missing_ingredients": [],
      "prep_time_minutes": 10,
      "cook_time_minutes": 15,
      "difficulty": "easy",
      "servings": 2,
      "steps": [
        "Chop the vegetables.",
        "Scramble the eggs.",
        "Stir-fry rice with kimchi and vegetables."
      ],
      "safety_notes": [
        "Check ingredient freshness before cooking."
      ]
    }
  ]
}
```

## API Requirements

### `POST /api/generate-recipes`

Request:

```json
{
  "ingredients": [
    {
      "name": "egg",
      "category": "protein",
      "quantity_estimate": "6",
      "unit": "pieces"
    }
  ],
  "preferences": {
    "cuisine": "Korean",
    "meal_type": "dinner",
    "max_cooking_time_minutes": 30,
    "dietary_restrictions": [],
    "allergies": [],
    "disliked_ingredients": [],
    "servings": 2
  }
}
```

Response:

```json
{
  "recipes": [],
  "model": "deepseek/deepseek-chat-v3.1:free"
}
```

Error cases:

- `400`: missing ingredients or invalid preferences
- `429`: OpenRouter or upstream provider rate limit
- `500`: unexpected server error
- `502`: invalid model response

## Data Requirements

Recipe object:

- `title`: recipe name
- `summary`: short description
- `used_ingredients`: detected ingredients used by the recipe
- `optional_missing_ingredients`: nice-to-have items
- `required_missing_ingredients`: must-have items not detected
- `prep_time_minutes`: estimated prep time
- `cook_time_minutes`: estimated cooking time
- `difficulty`: `easy`, `medium`, or `hard`
- `servings`: serving count
- `steps`: ordered cooking instructions
- `safety_notes`: freshness, allergy, or cooking safety reminders

## UX Requirements

- Show recipes as cards with title, time, difficulty, and matched ingredients.
- Highlight recipes that require no additional required ingredients.
- Let users expand a card to see full steps.
- Provide "Regenerate" and "Adjust Preferences" actions.
- Clearly label AI-generated content.

## Security and Safety

- Do not send personal profile data in this step unless explicitly needed.
- Do not log full prompts if they may contain private user preferences.
- Include allergy and freshness disclaimers in the UI.
- Treat recipe output as suggestions, not professional health advice.

## Success Metrics

- At least 80% of successful requests produce 3 or more valid recipe cards.
- At least 70% of recipes use 2 or more detected ingredients when enough ingredients are available.
- Users can move from confirmed ingredients to recipe results in under 30 seconds under normal API latency.

## Acceptance Criteria

- A user can generate recipes from Step 1 ingredients.
- The request uses `deepseek/deepseek-chat-v3.1:free`.
- Recipes include used ingredients, missing ingredients, time, difficulty, and steps.
- Invalid model output is handled without breaking the UI.
