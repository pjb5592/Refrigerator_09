# PRD 3단계: 사용자 프로필과 저장 레시피

## 개요

3단계는 사용자가 추천 레시피를 저장하고 나중에 다시 확인하며, 향후 추천을 개인화할 수 있도록 사용자 프로필을 추가합니다.

이 단계는 1단계 이미지 인식과 2단계 레시피 생성을 기반으로 합니다.

## 목표

- 사용자가 프로필을 만들 수 있게 합니다.
- 사용자가 2단계에서 생성된 레시피를 저장할 수 있게 합니다.
- 사용자가 저장된 레시피를 조회, 검색, 삭제할 수 있게 합니다.
- 향후 레시피 생성을 개선하기 위해 기본 조리 선호도를 저장합니다.

## 제외 범위

- 이 단계에서는 소셜 공유 기능을 만들지 않습니다.
- 이 단계에서는 유료 구독 기능을 만들지 않습니다.
- 식재료 배달 또는 캘린더 서비스와 동기화하지 않습니다.
- 기본적으로 원본 냉장고 이미지를 저장하지 않습니다.

## 의존성

- 1단계는 재료 인식 결과를 생성해야 합니다.
- 2단계는 레시피 추천 객체를 생성해야 합니다.
- 이 단계가 완료되려면 앱에 영구 데이터베이스가 포함되어야 합니다.

## 사용자 흐름

1. 사용자가 앱을 엽니다.
2. 사용자가 프로필을 만들거나 로그인합니다.
3. 사용자가 1단계와 2단계를 완료합니다.
4. 사용자가 레시피 카드에서 “레시피 저장”을 누릅니다.
5. 앱은 해당 레시피를 사용자 프로필 아래에 저장합니다.
6. 사용자는 “저장된 레시피”를 열어 이전에 저장한 레시피를 확인합니다.
7. 사용자는 저장된 레시피를 검색, 필터링, 열람, 삭제할 수 있습니다.

## 기능 요구사항

- 사용자는 이메일 또는 선택한 인증 제공자로 프로필을 만들 수 있어야 합니다.
- 사용자는 로그인과 로그아웃을 할 수 있어야 합니다.
- 사용자는 생성된 레시피를 저장할 수 있어야 합니다.
- 사용자는 저장된 레시피를 볼 수 있어야 합니다.
- 사용자는 저장된 레시피를 삭제할 수 있어야 합니다.
- 사용자는 다음 기본 선호도를 저장할 수 있어야 합니다.
  - 표시 이름
  - 선호 요리
  - 식단 제한
  - 알레르기
  - 싫어하는 재료
  - 기본 인분 수
  - 최대 조리 시간
- 저장된 레시피는 저장 시점의 생성 내용을 보존해야 합니다.
- 향후 레시피 생성은 사용자 동의를 바탕으로 프로필 선호도를 사용할 수 있어야 합니다.

## 권장 데이터 모델

### 사용자 프로필

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

### 저장 레시피

```json
{
  "id": "recipe_123",
  "user_id": "user_123",
  "title": "Kimchi Egg Fried Rice",
  "summary": "달걀과 남은 채소를 활용한 빠른 밥 요리입니다.",
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

## API 요구사항

### `POST /api/profile`

사용자 프로필을 만들거나 수정합니다.

요청:

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

로그인한 사용자의 프로필을 반환합니다.

### `POST /api/saved-recipes`

2단계에서 생성된 레시피를 저장합니다.

요청:

```json
{
  "recipe": {
    "title": "Kimchi Egg Fried Rice",
    "summary": "달걀과 남은 채소를 활용한 빠른 밥 요리입니다.",
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

로그인한 사용자의 저장 레시피를 반환합니다.

선택 쿼리 매개변수:

- `q`: 검색어
- `difficulty`: 레시피 난이도
- `max_time_minutes`: 최대 총 소요 시간

### `DELETE /api/saved-recipes/:id`

로그인한 사용자가 소유한 저장 레시피를 삭제합니다.

## UX 요구사항

- 로그인 후 프로필 설정 화면을 표시합니다.
- 필수 계정 필드를 제외한 프로필 설정은 건너뛸 수 있게 합니다.
- 2단계 레시피 카드에 “레시피 저장” 버튼을 추가합니다.
- 저장된 레시피를 별도 화면에 표시합니다.
- 저장된 레시피가 없는 사용자에게 빈 상태 안내를 제공합니다.
- 삭제 같은 파괴적 동작은 확인을 받습니다.

## 보안 및 개인정보

- 프로필 및 저장 레시피 엔드포인트에는 인증이 필요합니다.
- 사용자는 자신의 저장 레시피에만 접근할 수 있어야 합니다.
- 비밀번호는 신뢰할 수 있는 인증 제공자 또는 안전한 해시 방식으로만 저장합니다.
- OpenRouter 프롬프트나 원본 이미지를 기본 프로필 데이터로 저장하지 않습니다.
- 사용자는 프로필 선호도를 수정하거나 삭제할 수 있어야 합니다.

## 성공 지표

- 로그인한 사용자의 70% 이상이 오류 없이 레시피를 저장할 수 있습니다.
- 일반적인 계정에서 저장 레시피가 2초 이내에 로드됩니다.
- 프로필 선호도가 향후 레시피 생성 요청에 올바르게 적용됩니다.

## 인수 기준

- 사용자가 프로필을 만들거나 수정할 수 있습니다.
- 사용자가 2단계 레시피를 저장할 수 있습니다.
- 사용자가 저장 레시피를 조회하고 삭제할 수 있습니다.
- 저장 레시피는 로그인한 사용자 범위로 제한됩니다.
- 프로필 선호도는 레시피 생성의 기본 입력값으로 재사용될 수 있습니다.
