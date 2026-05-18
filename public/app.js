const maxImageSizeBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const form = document.querySelector('#upload-form');
const imageInput = document.querySelector('#image-input');
const previewCard = document.querySelector('#preview-card');
const imagePreview = document.querySelector('#image-preview');
const fileName = document.querySelector('#file-name');
const fileMeta = document.querySelector('#file-meta');
const analyzeButton = document.querySelector('#analyze-button');
const statusBox = document.querySelector('#status');
const resultsSection = document.querySelector('#results-section');
const ingredientsBody = document.querySelector('#ingredients-body');
const addIngredientButton = document.querySelector('#add-ingredient-button');
const uncertainSection = document.querySelector('#uncertain-section');
const uncertainList = document.querySelector('#uncertain-list');

const generateRecipesButton = document.querySelector('#generate-recipes-button');
const recipeStatus = document.querySelector('#recipe-status');
const recipesList = document.querySelector('#recipes-list');

const profileForm = document.querySelector('#profile-form');
const profileStatus = document.querySelector('#profile-status');
const refreshSavedButton = document.querySelector('#refresh-saved-button');
const savedSearch = document.querySelector('#saved-search');
const searchSavedButton = document.querySelector('#search-saved-button');
const savedRecipesList = document.querySelector('#saved-recipes-list');

let selectedFile = null;
let latestRecipes = [];
let previewUrl = '';

imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  setStatus(statusBox, '');

  if (!file) {
    clearPreview();
    return;
  }

  const validationError = validateImage(file);

  if (validationError) {
    clearPreview();
    setStatus(statusBox, validationError, 'error');
    imageInput.value = '';
    return;
  }

  selectedFile = file;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  fileName.textContent = file.name;
  fileMeta.textContent = `${file.type} · ${formatBytes(file.size)}`;
  previewCard.classList.remove('hidden');
  analyzeButton.disabled = false;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!selectedFile) {
    setStatus(statusBox, '분석할 이미지를 먼저 선택하세요.', 'error');
    return;
  }

  analyzeButton.disabled = true;
  setStatus(statusBox, '이미지를 분석하는 중입니다. 잠시만 기다려 주세요.');

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const payload = await requestJson('/api/recognize-image', {
      method: 'POST',
      body: formData
    });

    renderIngredients(payload);
    setStatus(statusBox, `분석이 완료되었습니다. 사용 모델: ${payload.model}`);
  } catch (error) {
    setStatus(statusBox, error.message, 'error');
  } finally {
    analyzeButton.disabled = false;
  }
});

addIngredientButton.addEventListener('click', () => {
  resultsSection.classList.remove('hidden');
  appendIngredientRow({
    name: '',
    category: '',
    quantity_estimate: '',
    unit: '',
    confidence: 1,
    notes: '수동 추가'
  });
});

generateRecipesButton.addEventListener('click', async () => {
  const ingredients = getIngredientsFromTable();

  if (ingredients.length === 0) {
    setStatus(recipeStatus, '레시피 생성을 위해 재료를 하나 이상 입력하세요.', 'error');
    return;
  }

  generateRecipesButton.disabled = true;
  setStatus(recipeStatus, '레시피를 생성하는 중입니다.');

  try {
    const payload = await requestJson('/api/generate-recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ingredients,
        preferences: getRecipePreferences()
      })
    });

    latestRecipes = payload.recipes;
    renderRecipes(latestRecipes);
    setStatus(recipeStatus, `레시피 생성 완료. 사용 모델: ${payload.model}`);
  } catch (error) {
    setStatus(recipeStatus, error.message, 'error');
  } finally {
    generateRecipesButton.disabled = false;
  }
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(profileStatus, '프로필을 저장하는 중입니다.');

  try {
    const payload = await requestJson('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(getProfilePayload())
    });

    applyProfileToRecipePreferences(payload.profile);
    setStatus(profileStatus, `${payload.profile.display_name} 프로필이 저장되었습니다.`);
  } catch (error) {
    setStatus(profileStatus, error.message, 'error');
  }
});

refreshSavedButton.addEventListener('click', () => loadSavedRecipes());
searchSavedButton.addEventListener('click', () => loadSavedRecipes(savedSearch.value));

savedSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadSavedRecipes(savedSearch.value);
  }
});

loadProfile();
loadSavedRecipes();

function validateImage(file) {
  if (!allowedTypes.has(file.type)) {
    return 'JPG, PNG, WebP 이미지만 업로드할 수 있습니다.';
  }

  if (file.size > maxImageSizeBytes) {
    return '이미지 크기는 5MB 이하여야 합니다.';
  }

  return '';
}

function clearPreview() {
  selectedFile = null;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }

  imagePreview.removeAttribute('src');
  fileName.textContent = '';
  fileMeta.textContent = '';
  previewCard.classList.add('hidden');
  analyzeButton.disabled = true;
}

function setStatus(element, message, type = 'info') {
  element.textContent = message;
  element.classList.toggle('hidden', !message);
  element.classList.toggle('error', type === 'error');
}

function renderIngredients(payload) {
  ingredientsBody.replaceChildren();
  uncertainList.replaceChildren();

  const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
  const uncertainItems = Array.isArray(payload.uncertain_items) ? payload.uncertain_items : [];

  if (ingredients.length === 0) {
    appendIngredientRow({
      name: '',
      category: '',
      quantity_estimate: '',
      unit: '',
      confidence: 0,
      notes: '신뢰할 수 있는 재료가 감지되지 않았습니다. 재료를 직접 추가하세요.'
    });
  } else {
    ingredients.forEach(appendIngredientRow);
  }

  uncertainItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.description || '알 수 없음'}: ${item.reason || '이유를 알 수 없음'}`;
    uncertainList.append(li);
  });

  uncertainSection.classList.toggle('hidden', uncertainItems.length === 0);
  resultsSection.classList.remove('hidden');
}

function appendIngredientRow(ingredient) {
  const row = document.createElement('tr');
  const confidence = Number(ingredient.confidence ?? 0);

  if (confidence < 0.6) {
    row.classList.add('low-confidence');
  }

  row.append(
    createInputCell(ingredient.name, 'name'),
    createInputCell(ingredient.category, 'category'),
    createInputCell(ingredient.quantity_estimate, 'quantity_estimate'),
    createInputCell(ingredient.unit, 'unit'),
    createConfidenceCell(confidence),
    createInputCell(ingredient.notes, 'notes'),
    createActionCell(row)
  );

  ingredientsBody.append(row);
}

function createInputCell(value, field) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.dataset.field = field;
  input.value = value === 'unknown' || value === '알 수 없음' ? '' : value || '';
  td.append(input);
  return td;
}

function createConfidenceCell(value) {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.dataset.field = 'confidence';
  input.type = 'number';
  input.min = '0';
  input.max = '1';
  input.step = '0.01';
  input.value = Number.isFinite(value) ? value.toFixed(2) : '0.00';
  td.append(input);

  if (value < 0.6) {
    const note = document.createElement('span');
    note.className = 'confidence-note';
    note.textContent = '확인 필요';
    td.append(note);
  }

  return td;
}

function createActionCell(row) {
  const td = document.createElement('td');
  const button = document.createElement('button');
  button.className = 'danger-button';
  button.type = 'button';
  button.textContent = '삭제';
  button.addEventListener('click', () => row.remove());
  td.append(button);
  return td;
}

function getIngredientsFromTable() {
  return [...ingredientsBody.querySelectorAll('tr')]
    .map((row) => ({
      name: getRowValue(row, 'name'),
      category: getRowValue(row, 'category'),
      quantity_estimate: getRowValue(row, 'quantity_estimate'),
      unit: getRowValue(row, 'unit')
    }))
    .filter((ingredient) => ingredient.name);
}

function getRowValue(row, field) {
  return row.querySelector(`[data-field="${field}"]`)?.value.trim() || '';
}

function getRecipePreferences() {
  return {
    cuisine: getValue('#pref-cuisine'),
    meal_type: getValue('#pref-meal-type'),
    max_cooking_time_minutes: Number(getValue('#pref-max-time')) || 30,
    dietary_restrictions: splitList(getValue('#pref-restrictions')),
    allergies: splitList(getValue('#pref-allergies')),
    disliked_ingredients: splitList(getValue('#pref-disliked')),
    servings: Number(getValue('#pref-servings')) || 2
  };
}

function renderRecipes(recipes) {
  recipesList.replaceChildren();

  if (recipes.length === 0) {
    recipesList.textContent = '추천 레시피가 없습니다.';
    return;
  }

  recipes.forEach((recipe, index) => {
    recipesList.append(createRecipeCard(recipe, { canSave: true, index }));
  });
}

function createRecipeCard(recipe, options = {}) {
  const card = document.createElement('article');
  card.className = 'recipe-card';

  const title = document.createElement('h3');
  title.textContent = recipe.title;

  const summary = document.createElement('p');
  summary.textContent = recipe.summary || '요약이 제공되지 않았습니다.';

  const meta = document.createElement('div');
  meta.className = 'recipe-meta';
  meta.append(
    createPill(formatDifficulty(recipe.difficulty || 'easy')),
    createPill(`${Number(recipe.prep_time_minutes || 0) + Number(recipe.cook_time_minutes || 0)}분`),
    createPill(`${recipe.servings || 2}인분`)
  );

  const used = createPillList('사용 재료', recipe.used_ingredients);
  const missing = createPillList(
    '추가 필요',
    [...(recipe.required_missing_ingredients || []), ...(recipe.optional_missing_ingredients || [])],
    true
  );
  const details = createRecipeDetails(recipe);

  card.append(title, summary, meta, used, missing, details);

  if (options.canSave) {
    const saveButton = document.createElement('button');
    saveButton.className = 'secondary-button';
    saveButton.type = 'button';
    saveButton.textContent = '레시피 저장';
    saveButton.addEventListener('click', () => saveRecipe(latestRecipes[options.index]));
    card.append(saveButton);
  }

  if (options.canDelete) {
    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger-button';
    deleteButton.type = 'button';
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', () => deleteSavedRecipe(recipe.id));
    card.append(deleteButton);
  }

  return card;
}

function createPill(text, missing = false) {
  const span = document.createElement('span');
  span.className = missing ? 'pill missing' : 'pill';
  span.textContent = text;
  return span;
}

function createPillList(label, items, missing = false) {
  const wrapper = document.createElement('div');
  const title = document.createElement('strong');
  const list = document.createElement('div');
  list.className = 'pill-list';
  title.textContent = label;
  wrapper.append(title);

  const values = Array.isArray(items) && items.length > 0 ? items : ['없음'];
  values.forEach((item) => list.append(createPill(item, missing && item !== '없음')));
  wrapper.append(list);
  return wrapper;
}

function createRecipeDetails(recipe) {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const steps = document.createElement('ol');
  const safety = document.createElement('ul');
  summary.textContent = '조리 단계 보기';

  (recipe.steps || []).forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    steps.append(li);
  });

  (recipe.safety_notes || []).forEach((note) => {
    const li = document.createElement('li');
    li.textContent = note;
    safety.append(li);
  });

  details.append(summary, steps);

  if (safety.children.length > 0) {
    const safetyTitle = document.createElement('strong');
    safetyTitle.textContent = '안전 메모';
    details.append(safetyTitle, safety);
  }

  return details;
}

async function saveRecipe(recipe) {
  setStatus(profileStatus, '레시피를 저장하는 중입니다.');

  try {
    await requestJson('/api/saved-recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipe })
    });
    setStatus(profileStatus, '레시피가 저장되었습니다.');
    await loadSavedRecipes();
  } catch (error) {
    setStatus(profileStatus, error.message, 'error');
  }
}

async function loadProfile() {
  try {
    const payload = await requestJson('/api/profile');
    if (payload.profile) {
      fillProfileForm(payload.profile);
      applyProfileToRecipePreferences(payload.profile);
    }
  } catch {
    setStatus(profileStatus, '프로필을 불러오지 못했습니다.', 'error');
  }
}

function fillProfileForm(profile) {
  setValue('#profile-email', profile.email);
  setValue('#profile-name', profile.display_name);
  setValue('#profile-cuisines', (profile.preferences?.preferred_cuisines || []).join(', '));
  setValue('#profile-restrictions', (profile.preferences?.dietary_restrictions || []).join(', '));
  setValue('#profile-allergies', (profile.preferences?.allergies || []).join(', '));
  setValue('#profile-disliked', (profile.preferences?.disliked_ingredients || []).join(', '));
  setValue('#profile-servings', profile.preferences?.default_servings || 2);
  setValue('#profile-max-time', profile.preferences?.max_cooking_time_minutes || 30);
}

function applyProfileToRecipePreferences(profile) {
  if (!profile?.preferences) {
    return;
  }

  setValue('#pref-cuisine', (profile.preferences.preferred_cuisines || []).join(', '));
  setValue('#pref-restrictions', (profile.preferences.dietary_restrictions || []).join(', '));
  setValue('#pref-allergies', (profile.preferences.allergies || []).join(', '));
  setValue('#pref-disliked', (profile.preferences.disliked_ingredients || []).join(', '));
  setValue('#pref-servings', profile.preferences.default_servings || 2);
  setValue('#pref-max-time', profile.preferences.max_cooking_time_minutes || 30);
}

function getProfilePayload() {
  return {
    email: getValue('#profile-email'),
    display_name: getValue('#profile-name'),
    preferences: {
      preferred_cuisines: splitList(getValue('#profile-cuisines')),
      dietary_restrictions: splitList(getValue('#profile-restrictions')),
      allergies: splitList(getValue('#profile-allergies')),
      disliked_ingredients: splitList(getValue('#profile-disliked')),
      default_servings: Number(getValue('#profile-servings')) || 2,
      max_cooking_time_minutes: Number(getValue('#profile-max-time')) || 30
    }
  };
}

async function loadSavedRecipes(search = '') {
  try {
    const params = new URLSearchParams();
    if (search) {
      params.set('q', search);
    }

    const payload = await requestJson(`/api/saved-recipes${params.toString() ? `?${params}` : ''}`);
    renderSavedRecipes(payload.recipes || []);
  } catch {
    savedRecipesList.textContent = '저장된 레시피를 불러오지 못했습니다.';
  }
}

function renderSavedRecipes(recipes) {
  savedRecipesList.replaceChildren();

  if (recipes.length === 0) {
    savedRecipesList.textContent = '저장된 레시피가 없습니다.';
    return;
  }

  recipes.forEach((recipe) => {
    savedRecipesList.append(createRecipeCard(recipe, { canDelete: true }));
  });
}

async function deleteSavedRecipe(id) {
  if (!window.confirm('이 저장된 레시피를 삭제할까요?')) {
    return;
  }

  try {
    const response = await fetch(`/api/saved-recipes/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('삭제 요청이 실패했습니다.');
    }

    await loadSavedRecipes(savedSearch.value);
  } catch {
    setStatus(profileStatus, '레시피 삭제에 실패했습니다.', 'error');
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(payload.error || `요청이 실패했습니다. 상태 코드: ${response.status}`);
  }

  return payload;
}

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getValue(selector) {
  return document.querySelector(selector)?.value.trim() || '';
}

function setValue(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.value = value || '';
  }
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDifficulty(value) {
  const labels = {
    easy: '쉬움',
    medium: '보통',
    hard: '어려움'
  };

  return labels[value] || value;
}
