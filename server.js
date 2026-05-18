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
const openRouterTimeoutMs = 45_000;
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
          ? '이미지가 너무 큽니다. 5MB 이하의 이미지를 업로드하세요.'
          : isUnsupported
            ? '지원하지 않는 이미지 형식입니다. JPG, PNG, WebP 이미지를 업로드하세요.'
            : '업로드한 이미지를 읽을 수 없습니다.'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: '이미지 파일이 없습니다.' });
      return;
    }

    if (!process.env.OPENROUTER_API_KEY) {
      res.status(500).json({ error: '서버에 OPENROUTER_API_KEY가 설정되어 있지 않습니다.' });
      return;
    }

    try {
      const imageDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const { openRouterResponse, responseBody } = await postOpenRouterChatCompletion({
          model,
          temperature: 0.1,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                '냉장고 이미지에서 재료를 식별합니다. 유효한 JSON만 반환하고 마크다운 코드 블록이나 추가 설명은 포함하지 마세요.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    '이 냉장고 이미지에서 보이는 식재료와 포장 식품을 식별하세요. 다음 구조의 JSON만 반환하세요: {"ingredients":[{"name":"string","category":"string","quantity_estimate":"string","unit":"string","confidence":0.0,"notes":"string"}],"uncertain_items":[{"description":"string","reason":"string"}]}. 재료 이름과 설명은 한국어로 작성하세요. 수량이나 단위를 알 수 없으면 "알 수 없음"을 사용하세요. confidence는 0과 1 사이의 숫자여야 합니다.'
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
        });

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
          error: '모델이 잘못된 재료 형식을 반환했습니다. 다시 시도하세요.'
        });
        return;
      }

      res.json({
        ingredients: normalizeIngredients(parsed.ingredients),
        uncertain_items: normalizeUncertainItems(parsed.uncertain_items),
        model
      });
    } catch (error) {
      console.error('이미지 인식 실패:', error.message);
      if (error.name === 'AbortError') {
        res.status(504).json({ error: 'OpenRouter 이미지 인식 시간이 초과되었습니다. 다시 시도하세요.' });
        return;
      }

      res.status(500).json({ error: '이미지 인식 중 예상하지 못한 서버 오류가 발생했습니다.' });
    }
  });
});

app.post('/api/generate-recipes', async (req, res) => {
  const ingredients = normalizeRecipeInputIngredients(req.body?.ingredients);
  const preferences = normalizePreferences(req.body?.preferences);

  if (ingredients.length === 0) {
    res.status(400).json({ error: '재료가 하나 이상 필요합니다.' });
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    res.status(500).json({ error: '서버에 OPENROUTER_API_KEY가 설정되어 있지 않습니다.' });
    return;
  }

  try {
    const { openRouterResponse, responseBody } = await postOpenRouterChatCompletion({
        model: recipeModel,
        temperature: 0.2,
        max_tokens: 3200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '냉장고 재료로 실제 가정에서 만들 수 있는 레시피를 생성합니다. 유효한 JSON 객체 하나만 반환하고, 마크다운 코드 블록이나 추가 설명은 포함하지 마세요.'
          },
          {
            role: 'user',
            content: `다음 재료와 선호도를 바탕으로 정확히 3개의 레시피를 추천하세요. 인식된 재료를 우선 사용하는 레시피를 선호하세요. 다음 JSON 스키마만 반환하세요: {"recipes":[{"title":"string","summary":"string","used_ingredients":["string"],"optional_missing_ingredients":["string"],"required_missing_ingredients":["string"],"prep_time_minutes":0,"cook_time_minutes":0,"difficulty":"easy","servings":2,"steps":["string"],"safety_notes":["string"]}]}. title, summary, ingredients, steps, safety_notes 값은 한국어로 작성하세요. difficulty 값은 easy, medium, hard 중 하나를 사용하세요. 재료: ${JSON.stringify(ingredients)}. 선호도: ${JSON.stringify(preferences)}.`
          }
        ]
      });

    if (!openRouterResponse.ok) {
      const status = openRouterResponse.status === 429 ? 429 : 502;
      res.status(status).json({
        error: getProviderErrorMessage(responseBody, openRouterResponse.status)
      });
      return;
    }

    const content = responseBody?.choices?.[0]?.message?.content;
    const parsed = parseModelJson(content);
    const recipes = normalizeRecipes(Array.isArray(parsed) ? parsed : parsed?.recipes);

    if (recipes.length === 0) {
      res.status(502).json({
        error: '모델이 잘못된 레시피 형식을 반환했습니다. 다시 시도하세요.'
      });
      return;
    }

    res.json({
      recipes,
      model: recipeModel
    });
  } catch (error) {
    console.error('레시피 생성 실패:', error.message);
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'OpenRouter 레시피 생성 시간이 초과되었습니다. 다시 시도하세요.' });
      return;
    }

    res.status(500).json({ error: '레시피 생성 중 예상하지 못한 서버 오류가 발생했습니다.' });
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
    res.status(400).json({ error: '로컬 프로필에는 이메일이 필요합니다.' });
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
    res.status(400).json({ error: '레시피를 저장하기 전에 프로필을 생성하세요.' });
    return;
  }

  const recipe = normalizeSavedRecipe(req.body?.recipe);

  if (!recipe.title) {
    res.status(400).json({ error: '레시피 제목이 필요합니다.' });
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
    res.status(404).json({ error: '저장된 레시피를 찾을 수 없습니다.' });
    return;
  }

  await writeStore(store);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Refrigerator_09가 http://localhost:${port}에서 실행 중입니다.`);
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

async function postOpenRouterChatCompletion(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), openRouterTimeoutMs);

  try {
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: getOpenRouterHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const responseBody = await openRouterResponse.json().catch(() => null);

    return { openRouterResponse, responseBody };
  } finally {
    clearTimeout(timeout);
  }
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
      console.error('로컬 데이터 저장소를 읽지 못했습니다:', error.message);
    }

    return { profile: null, saved_recipes: [] };
  }
}

async function writeStore(store) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2));
}
