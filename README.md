# Refrigerator_09
작성자: 변중배, 리뷰어: 김정용, 남원희, 박성준, 송성훈, 김대경, 최혁성

## 환경 설정

이 프로젝트는 API 키와 같은 비밀값을 로컬 `.env` 파일에 저장합니다.

1. `.env.example`을 `.env`로 복사합니다.
2. `your_openrouter_api_key_here`를 본인의 OpenRouter API 키로 바꿉니다.
3. `.env`를 커밋하거나 API 키를 클라이언트 코드, 로그, 스크린샷, 프롬프트에 붙여넣지 않습니다.

선택적으로 사용할 모델을 바꿀 수 있습니다.

```bash
OPENROUTER_IMAGE_MODEL=google/gemma-3-27b-it:free
OPENROUTER_RECIPE_MODEL=deepseek/deepseek-chat-v3.1:free
```

## OpenRouter 키 보안

- `OPENROUTER_API_KEY`는 서버에서만 사용합니다.
- 키를 코드에 직접 적지 말고 환경변수로 읽습니다.
- 키가 커밋되거나 외부에 노출되면 OpenRouter에서 즉시 폐기하고 새 키를 발급합니다.
- 프론트엔드 앱에서는 브라우저에서 OpenRouter를 직접 호출하지 않고 자체 백엔드 API를 호출합니다.

## 앱 실행

의존성을 설치합니다.

```bash
npm install
```

로컬 웹 앱을 시작합니다.

```bash
npm start
```

브라우저에서 `http://localhost:3000`을 엽니다.

- 1단계는 이미지를 `google/gemma-3-27b-it:free` 모델로 OpenRouter에 보내고, 수정 가능한 재료 인식 결과를 반환합니다.
- 2단계는 확인된 재료를 `deepseek/deepseek-chat-v3.1:free` 모델로 OpenRouter에 보내고, 레시피 카드를 반환합니다.
- 3단계는 개발용 로컬 프로필과 저장 레시피를 `data/app-data.json`에 저장합니다.

## 로컬 테스트 명령

상태 확인:

```bash
curl http://localhost:3000/api/health
```

레시피 생성 테스트:

```bash
curl -X POST http://localhost:3000/api/generate-recipes \
  -H "Content-Type: application/json" \
  -d '{"ingredients":[{"name":"egg","category":"protein","quantity_estimate":"2","unit":"pieces"},{"name":"rice","category":"grain","quantity_estimate":"1","unit":"bowl"}],"preferences":{"cuisine":"Korean","meal_type":"dinner","max_cooking_time_minutes":30,"dietary_restrictions":[],"allergies":[],"disliked_ingredients":[],"servings":2}}'
```

프로필 및 저장 레시피 테스트:

```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","display_name":"Home Cook","preferences":{"preferred_cuisines":["Korean"],"dietary_restrictions":[],"allergies":[],"disliked_ingredients":[],"default_servings":2,"max_cooking_time_minutes":30}}'
```

## 격리된 로컬 실행 환경

이 프로젝트는 Node.js와 프로젝트 내부 `node_modules`를 사용하므로 Python 방식의 가상환경은 필요하지 않습니다. 격리된 환경에서 실행하려면 새 클론 또는 새 폴더에서 다음 명령을 실행합니다.

```bash
npm ci
npm start
```

## C++ 에이전트 등록 정보

에이전트 역할은 `agents/agent_roles.cpp`에 정의되어 있습니다.

C++ 컴파일러가 설치되어 있으면 다음 명령으로 빌드하고 실행할 수 있습니다.

```bash
npm run agents:build
npm run agents:run
```

## 백업 및 복원

현재 업로드된 개발 상태는 다음 브랜치에 백업되어 있습니다.

```text
backup/dev-before-agent-improvements
```

로컬에서 백업 상태로 복원하려면 다음 명령을 실행합니다.

```bash
git switch dev
git reset --hard backup/dev-before-agent-improvements
```

복원 명령은 이후의 로컬 변경사항을 버려도 될 때만 실행하세요.
