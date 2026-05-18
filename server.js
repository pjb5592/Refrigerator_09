import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const model = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemma-3-27b-it:free';
const recipeModel = process.env.OPENROUTER_RECIPE_MODEL || 'deepseek/deepseek-chat-v3.1:free';
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'app-data.json');
const maxImageSizeBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxImageSizeBytes,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('UNSUPPORTED_IMAGE_TYPE'));
      return;
    }

    cb(null, true);
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/recognize-image', (req, res) => {
  upload.single('image')(req, res, async (uploadError) => {
    if (uploadError) {
      const isTooLarge = uploadError.code === 'LIMIT_FILE_SIZE';
      const isUnsupported = uploadError.message === 'UNSUPPORTED_IMAGE_TYPE';

      res.status(400).json({
        error: isTooLarge
          ? 'Image is too large. Please upload an image under 5MB.'
          : isUnsupported
            ? 'Unsupported image type. Please upload JPG, PNG, or WebP.'
            : 'Unable to read the uploaded image.'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Missing image file.' });
      return;
    }

    if (!process.env.OPENROUTER_API_KEY) {
      res.status(500).json({ error: 'Server is missing OPENROUTER_API_KEY.' });
      return;
    }

    try {
      const imageDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/pjb5592/Refrigerator_09',
          'X-Title': 'Refrigerator_09'
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 1200,
          messages: [
            {
              role: 'system',
              content:
                'You identify refrigerator ingredients from images. Return valid JSON only. Do not include markdown fences or extra commentary.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'Identify visible food ingredients and packaged food items in this refrigerator image. Return JSON with this exact shape: {"ingredients":[{"name":"string","category":"string","quantity_estimate":"string","unit":"string","confidence":0.0,"notes":"string"}],"uncertain_items":[{"description":"string","reason":"string"}]}. Use English ingredient names. If quantity or unit is unknown, use "unknown". Confidence must be between 0 and 1.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageDataUrl
                  }
                }
              ]
            }
          ]
        })
      });

      const responseBody = await openRouterResponse.json().catch(() => null);

      if (!openRouterResponse.ok) {
        const status = openRouterResponse.status === 429 ? 429 : 502;
        res.status(status).json({
          error: getProviderErrorMessage(responseBody, openRouterResponse.status)
        });
        return;
      }

      const content = responseBody?.choices?.[0]?.message?.content;
      const parsed = parseModelJson(content);

      if (!parsed) {
        res.status(502).json({
          error: 'The model returned an invalid ingredient format. Please retry.'
        });
        return;
      }

      res.json({
        ingredients: normalizeIngredients(parsed.ingredients),
        uncertain_items: normalizeUncertainItems(parsed.uncertain_items),
        model
      });
    } catch (error) {
      console.error('Image recognition failed:', error.message);
      res.status(500).json({ error: 'Unexpected server error while recognizing the image.' });
    }
  });
});

app.post('/api/generate-recipes', async (req, res) => {
  const ingredients = normalizeRecipeInputIngredients(req.body?.ingredients);
  const preferences = normalizePreferences(req.body?.preferences);

  if (ingredients.length === 0) {
    res.status(400).json({ error: 'At least one ingredient is required.' });
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    res.status(500).json({ error: 'Server is missing OPENROUTER_API_KEY.' });
    return;
  }

  try {
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: getOpenRouterHeaders(),
      body: JSON.stringify({
        model: recipeModel,
        temperature: 0.4,
        max_tokens: 2200,
        messages: [
          {
            role: 'system',
            content:
              'You generate practical home recipes from refrigerator ingredients. Return valid JSON only. Do not include markdown fences or commentary.'
          },
          {
            role: 'user',
            content: `Create 3 recipe recommendations from these ingredients and preferences. Prefer recipes that use detected ingredients. Return JSON with this exact shape: {"recipes":[{"title":"string","summary":"string","used_ingredients":["string"],"optional_missing_ingredients":["string"],"required_missing_ingredients":["string"],"prep_time_minutes":0,"cook_time_minutes":0,"difficulty":"easy","servings":2,"steps":["string"],"safety_notes":["string"]}]}. Ingredients: ${JSON.stringify(ingredients)}. Preferences: ${JSON.stringify(preferences)}.`
          }
        ]
      })
    });

    const responseBody = await openRouterResponse.json().catch(() => null);

    if (!openRouterResponse.ok) {
      const status = openRouterResponse.status === 429 ? 429 : 502;
      res.status(status).json({
        error: getProviderErrorMessage(responseBody, openRouterResponse.status)
      });
      return;
    }

    const content = responseBody?.choices?.[0]?.message?.content;
    const parsed = parseModelJson(content);
    const recipes = normalizeRecipes(parsed?.recipes);

    if (recipes.length === 0) {
      res.status(502).json({
        error: 'The model returned an invalid recipe format. Please retry.'
      });
      return;
    }

    res.json({
      recipes,
      model: recipeModel
    });
  } catch (error) {
    console.error('Recipe generation failed:', error.message);
    res.status(500).json({ error: 'Unexpected server error while generating recipes.' });
  }
});

app.get('/api/profile', async (_req, res) => {
  const store = await readStore();
  res.json({ profile: store.profile });
});

app.post('/api/profile', async (req, res) => {
  const email = toOptionalString(req.body?.email);
  const displayName = toOptionalString(req.body?.display_name);

  if (!email) {
    res.status(400).json({ error: 'Email is required for the local profile.' });
    return;
  }

  const now = new Date().toISOString();
  const store = await readStore();
  const profile = {
    id: store.profile?.id || 'local-user',
    email,
    display_name: displayName || email,
    preferences: normalizeProfilePreferences(req.body?.preferences),
    created_at: store.profile?.created_at || now,
    updated_at: now
  };

  store.profile = profile;
  await writeStore(store);
  res.json({ profile });
});

app.post('/api/saved-recipes', async (req, res) => {
  const store = await readStore();

  if (!store.profile) {
    res.status(400).json({ error: 'Create a profile before saving recipes.' });
    return;
  }

  const recipe = normalizeSavedRecipe(req.body?.recipe);

  if (!recipe.title) {
    res.status(400).json({ error: 'Recipe title is required.' });
    return;
  }

  const savedRecipe = {
    id: crypto.randomUUID(),
    user_id: store.profile.id,
    ...recipe,
    source_model: recipeModel,
    created_at: new Date().toISOString()
  };

  store.saved_recipes.unshift(savedRecipe);
  await writeStore(store);
  res.status(201).json({ recipe: savedRecipe });
});

app.get('/api/saved-recipes', async (req, res) => {
  const store = await readStore();
  const q = toOptionalString(req.query?.q).toLowerCase();
  const difficulty = toOptionalString(req.query?.difficulty).toLowerCase();
  const maxTime = Number(req.query?.max_time_minutes);

  let recipes = store.saved_recipes;

  if (q) {
    recipes = recipes.filter((recipe) =>
      [recipe.title, recipe.summary, ...(recipe.used_ingredients || [])]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  if (difficulty) {
    recipes = recipes.filter((recipe) => recipe.difficulty === difficulty);
  }

  if (!Number.isNaN(maxTime) && maxTime > 0) {
    recipes = recipes.filter(
      (recipe) => Number(recipe.prep_time_minutes) + Number(recipe.cook_time_minutes) <= maxTime
    );
  }

  res.json({ recipes });
});

app.delete('/api/saved-recipes/:id', async (req, res) => {
  const store = await readStore();
  const beforeCount = store.saved_recipes.length;
  store.saved_recipes = store.saved_recipes.filter((recipe) => recipe.id !== req.params.id);

  if (store.saved_recipes.length === beforeCount) {
    res.status(404).json({ error: 'Saved recipe was not found.' });
    return;
  }

  await writeStore(store);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Refrigerator_09 is running at http://localhost:${port}`);
});

function parseModelJson(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const match = withoutFence.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function getOpenRouterHeaders() {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/pjb5592/Refrigerator_09',
    'X-Title': 'Refrigerator_09'
  };
}

function normalizeIngredients(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    name: toStringValue(item?.name),
    category: toStringValue(item?.category),
    quantity_estimate: toStringValue(item?.quantity_estimate),
    unit: toStringValue(item?.unit),
    confidence: clampConfidence(item?.confidence),
    notes: toStringValue(item?.notes)
  }));
}

function normalizeUncertainItems(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    description: toStringValue(item?.description),
    reason: toStringValue(item?.reason)
  }));
}

function normalizeRecipeInputIngredients(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      name: toOptionalString(item?.name),
      category: toOptionalString(item?.category),
      quantity_estimate: toOptionalString(item?.quantity_estimate),
      unit: toOptionalString(item?.unit)
    }))
    .filter((item) => item.name);
}

function normalizePreferences(value) {
  return {
    cuisine: toOptionalString(value?.cuisine),
    meal_type: toOptionalString(value?.meal_type),
    max_cooking_time_minutes: positiveNumberOrDefault(value?.max_cooking_time_minutes, 30),
    dietary_restrictions: toStringArray(value?.dietary_restrictions),
    allergies: toStringArray(value?.allergies),
    disliked_ingredients: toStringArray(value?.disliked_ingredients),
    servings: positiveNumberOrDefault(value?.servings, 2)
  };
}

function normalizeProfilePreferences(value) {
  return {
    preferred_cuisines: toStringArray(value?.preferred_cuisines),
    dietary_restrictions: toStringArray(value?.dietary_restrictions),
    allergies: toStringArray(value?.allergies),
    disliked_ingredients: toStringArray(value?.disliked_ingredients),
    default_servings: positiveNumberOrDefault(value?.default_servings, 2),
    max_cooking_time_minutes: positiveNumberOrDefault(value?.max_cooking_time_minutes, 30)
  };
}

function normalizeRecipes(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((recipe) => ({
      title: toOptionalString(recipe?.title),
      summary: toOptionalString(recipe?.summary),
      used_ingredients: toStringArray(recipe?.used_ingredients),
      optional_missing_ingredients: toStringArray(recipe?.optional_missing_ingredients),
      required_missing_ingredients: toStringArray(recipe?.required_missing_ingredients),
      prep_time_minutes: positiveNumberOrDefault(recipe?.prep_time_minutes, 0),
      cook_time_minutes: positiveNumberOrDefault(recipe?.cook_time_minutes, 0),
      difficulty: normalizeDifficulty(recipe?.difficulty),
      servings: positiveNumberOrDefault(recipe?.servings, 2),
      steps: toStringArray(recipe?.steps),
      safety_notes: toStringArray(recipe?.safety_notes)
    }))
    .filter((recipe) => recipe.title && recipe.steps.length > 0);
}

function normalizeSavedRecipe(value) {
  return normalizeRecipes([value])[0] || {
    title: toOptionalString(value?.title),
    summary: toOptionalString(value?.summary),
    used_ingredients: toStringArray(value?.used_ingredients),
    optional_missing_ingredients: toStringArray(value?.optional_missing_ingredients),
    required_missing_ingredients: toStringArray(value?.required_missing_ingredients),
    prep_time_minutes: positiveNumberOrDefault(value?.prep_time_minutes, 0),
    cook_time_minutes: positiveNumberOrDefault(value?.cook_time_minutes, 0),
    difficulty: normalizeDifficulty(value?.difficulty),
    servings: positiveNumberOrDefault(value?.servings, 2),
    steps: toStringArray(value?.steps),
    safety_notes: toStringArray(value?.safety_notes)
  };
}

function normalizeDifficulty(value) {
  const difficulty = toOptionalString(value).toLowerCase();
  return ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'easy';
}

function positiveNumberOrDefault(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(toOptionalString).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toStringValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'unknown';
}

function toOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clampConfidence(value) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return Math.min(1, Math.max(0, numberValue));
}

function getProviderErrorMessage(body, status) {
  const rawMessage = body?.error?.message || body?.error || `OpenRouter request failed with status ${status}.`;

  if (status === 429) {
    return `OpenRouter or the upstream model provider is rate-limited. ${rawMessage}`;
  }

  return rawMessage;
}

async function readStore() {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      profile: parsed.profile || null,
      saved_recipes: Array.isArray(parsed.saved_recipes) ? parsed.saved_recipes : []
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to read local data store:', error.message);
    }

    return { profile: null, saved_recipes: [] };
  }
}

async function writeStore(store) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}
