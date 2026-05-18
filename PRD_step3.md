# PRD Step 3: User Profiles and Saved Recipes

## Overview

Step 3 adds user profiles so users can save recipe recommendations, revisit them later, and personalize future recommendations.

This step builds on Step 1 image recognition and Step 2 recipe generation.

## Goals

- Let users create a profile.
- Let users save recipes generated in Step 2.
- Let users view, search, and delete saved recipes.
- Store basic cooking preferences to improve future recipe generation.

## Non-Goals

- Do not build social sharing in this step.
- Do not build paid subscriptions in this step.
- Do not sync with grocery delivery or calendar services.
- Do not store raw refrigerator images by default.

## Dependencies

- Step 1 must produce ingredient recognition results.
- Step 2 must produce recipe recommendation objects.
- The app must include a persistent database before this step is considered complete.

## User Flow

1. User opens the app.
2. User creates a profile or signs in.
3. User completes Step 1 and Step 2.
4. User clicks "Save Recipe" on a recipe card.
5. App stores the recipe under the user's profile.
6. User opens "Saved Recipes" to view previously saved recipes.
7. User can search, filter, open, or delete saved recipes.

## Functional Requirements

- Users must be able to create a profile with email or another chosen identity provider.
- Users must be able to sign in and sign out.
- Users must be able to save a generated recipe.
- Users must be able to view saved recipes.
- Users must be able to delete saved recipes.
- Users must be able to store basic preferences:
  - display name
  - preferred cuisines
  - dietary restrictions
  - allergies
  - disliked ingredients
  - default serving count
  - maximum cooking time
- Saved recipes must preserve the generated recipe content at the time of saving.
- Future recipe generation should be able to use profile preferences with user consent.

## Suggested Data Model

### User Profile

```json
{
  "id": "user_123",
  "email": "user@example.com",
  "display_name": "Home Cook",
  "preferences": {
    "preferred_cuisines": ["Korean", "Japanese"],
    "dietary_restrictions": [],
    "allergies": ["peanut"],
    "disliked_ingredients": ["cilantro"],
    "default_servings": 2,
    "max_cooking_time_minutes": 30
  },
  "created_at": "2026-05-18T00:00:00Z",
  "updated_at": "2026-05-18T00:00:00Z"
}
```

### Saved Recipe

```json
{
  "id": "recipe_123",
  "user_id": "user_123",
  "title": "Kimchi Egg Fried Rice",
  "summary": "A quick rice dish using eggs and leftover vegetables.",
  "used_ingredients": ["egg", "green onion", "rice"],
  "optional_missing_ingredients": ["sesame oil"],
  "required_missing_ingredients": [],
  "prep_time_minutes": 10,
  "cook_time_minutes": 15,
  "difficulty": "easy",
  "servings": 2,
  "steps": [],
  "source_model": "deepseek/deepseek-chat-v3.1:free",
  "created_at": "2026-05-18T00:00:00Z"
}
```

## API Requirements

### `POST /api/profile`

Creates or updates a user profile.

Request:

```json
{
  "display_name": "Home Cook",
  "preferences": {
    "preferred_cuisines": ["Korean"],
    "dietary_restrictions": [],
    "allergies": [],
    "disliked_ingredients": [],
    "default_servings": 2,
    "max_cooking_time_minutes": 30
  }
}
```

### `GET /api/profile`

Returns the signed-in user's profile.

### `POST /api/saved-recipes`

Saves a recipe generated in Step 2.

Request:

```json
{
  "recipe": {
    "title": "Kimchi Egg Fried Rice",
    "summary": "A quick rice dish using eggs and leftover vegetables.",
    "used_ingredients": ["egg", "green onion", "rice"],
    "optional_missing_ingredients": ["sesame oil"],
    "required_missing_ingredients": [],
    "prep_time_minutes": 10,
    "cook_time_minutes": 15,
    "difficulty": "easy",
    "servings": 2,
    "steps": []
  }
}
```

### `GET /api/saved-recipes`

Returns the signed-in user's saved recipes.

Optional query parameters:

- `q`: search text
- `difficulty`: recipe difficulty
- `max_time_minutes`: maximum total time

### `DELETE /api/saved-recipes/:id`

Deletes a saved recipe owned by the signed-in user.

## UX Requirements

- Show a profile setup screen after sign-in.
- Keep profile setup skippable except for required account fields.
- Add a "Save Recipe" button to Step 2 recipe cards.
- Show saved recipes in a dedicated page.
- Provide empty states for users with no saved recipes.
- Confirm destructive delete actions.

## Security and Privacy

- Require authentication for profile and saved recipe endpoints.
- Users must only access their own saved recipes.
- Store passwords only through a trusted authentication provider or secure password hashing.
- Do not store OpenRouter prompts or raw images as profile data by default.
- Let users edit or delete profile preferences.

## Success Metrics

- At least 70% of signed-in users can save a recipe without error.
- Saved recipes load in under 2 seconds for typical accounts.
- Profile preferences are correctly applied to future recipe generation requests.

## Acceptance Criteria

- A user can create or update a profile.
- A user can save a Step 2 recipe.
- A user can view and delete saved recipes.
- Saved recipes are scoped to the signed-in user.
- Profile preferences can be reused as default inputs for recipe generation.
