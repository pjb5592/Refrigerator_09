#include <iostream>
#include <string>
#include <vector>

struct AgentRole {
  std::string id;
  std::string name;
  std::string mission;
  std::vector<std::string> responsibilities;
};

void printAgent(const AgentRole& agent) {
  std::cout << "## " << agent.name << " (" << agent.id << ")\n";
  std::cout << agent.mission << "\n";
  for (const auto& responsibility : agent.responsibilities) {
    std::cout << "- " << responsibility << "\n";
  }
  std::cout << "\n";
}

int main() {
  const std::vector<AgentRole> agents = {
      {
          "performance-optimizer",
          "최적화 전문가",
          "병목 지점을 찾고 애플리케이션 속도, 안정성, 실행 효율을 개선합니다.",
          {
              "서버 요청 지연 시간과 외부 API 타임아웃 처리를 검토합니다.",
              "불필요한 클라이언트 작업과 반복 DOM 조작을 줄입니다.",
              "캐싱, 검증, 페이로드 크기 제어 방안을 제안합니다.",
          },
      },
      {
          "ux-design-advisor",
          "UX 디자이너",
          "화면 구성, 버튼 배치, 안내 문구, 오류 복구 흐름을 개선해 사용성을 높입니다.",
          {
              "이미지 인식이 실패해도 수동 재료 입력이 가능하게 합니다.",
              "모델과 제공자 오류를 사용자가 이해하기 쉬운 문구로 정리합니다.",
              "반응형 레이아웃과 주요 동작의 우선순위를 개선합니다.",
          },
      },
      {
          "code-bug-analyzer",
          "코드 버그 분석가",
          "Refrigerator_09 코드베이스의 결함, 위험한 예외 상황, 누락된 검증을 검토합니다.",
          {
              "API 오류 경로와 잘못된 모델 응답 처리를 점검합니다.",
              "클라이언트의 빈 상태와 삭제 같은 파괴적 동작을 확인합니다.",
              "최적화와 UX 변경 전에 문제를 보고합니다.",
          },
      },
      {
          "product-manager",
          "프로덕트 매니저",
          "제품 목표, 기능 범위, 사용자 요구사항, 개발 우선순위를 정의합니다.",
          {
              "이미지 인식, 레시피 생성, 프로필 저장 기능의 PRD를 관리합니다.",
              "사용자 가치와 인수 기준을 기준으로 우선순위를 정합니다.",
              "전문 에이전트들의 리뷰 피드백을 조율합니다.",
          },
      },
      {
          "server-side-engineer",
          "서버 사이드 개발 전문가",
          "안정적인 백엔드 API, 데이터 처리, 외부 연동, 보안, 성능을 설계합니다.",
          {
              "비밀값을 노출하지 않는 OpenRouter 연동을 구현합니다.",
              "요청 본문을 검증하고 AI 응답을 정규화합니다.",
              "로컬 개발 데이터가 소스 관리에 포함되지 않도록 분리합니다.",
          },
      },
      {
          "client-side-engineer",
          "클라이언트 사이드 개발 전문가",
          "접근성, 반응형 디자인, 성능을 고려한 사용자 인터페이스를 구현합니다.",
          {
              "업로드, 레시피, 프로필, 저장 레시피 흐름을 연결합니다.",
              "키보드 친화적인 폼과 의미 있는 빈 상태를 개선합니다.",
              "재시도 상황에서도 UI 상태가 예측 가능하게 유지되도록 합니다.",
          },
      },
      {
          "quality-manager",
          "품질 관리 전문가",
          "기능, 오류 처리, 성능, 코드 리뷰 품질, 사용성을 테스트합니다.",
          {
              "API 성공 경로와 실패 경로를 검증합니다.",
              "저장 레시피 생성, 조회, 삭제 동작을 확인합니다.",
              "남은 위험과 권장 회귀 테스트를 문서화합니다.",
          },
      },
      {
          "llm-integration-expert",
          "LLM 통합 전문가",
          "OpenRouter를 통한 LLM 서비스 연동, 프롬프트 최적화, 모델 동작 관리를 담당합니다.",
          {
              "OpenRouter를 통해 DeepSeek를 사용하여 텍스트 생성과 요약을 구현합니다.",
              "프롬프트를 구조화하고 필요할 때 JSON 전용 응답을 요청합니다.",
              "제공자 가용성에 대응할 수 있도록 모델 override 설정을 지원합니다.",
          },
      },
  };

  std::cout << "# Refrigerator_09 에이전트 등록 정보\n\n";
  for (const auto& agent : agents) {
    printAgent(agent);
  }

  std::cout << "# 권장 리뷰 워크플로\n";
  std::cout << "1. code-bug-analyzer가 전체 애플리케이션을 리뷰합니다.\n";
  std::cout << "2. performance-optimizer가 병목과 지연 위험을 수정합니다.\n";
  std::cout << "3. ux-design-advisor가 상호작용과 복구 경로를 개선합니다.\n";
  std::cout << "4. quality-manager가 개선된 애플리케이션을 검증합니다.\n";

  return 0;
}
