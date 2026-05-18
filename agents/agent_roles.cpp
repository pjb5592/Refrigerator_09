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
          "Optimization Expert",
          "Find bottlenecks and improve application speed, stability, and runtime efficiency.",
          {
              "Review server request latency and external API timeout handling.",
              "Reduce unnecessary client work and repeated DOM operations.",
              "Recommend caching, validation, and payload-size controls.",
          },
      },
      {
          "ux-design-advisor",
          "UX Designer",
          "Improve screen layout, button placement, copy, and error recovery for comfortable use.",
          {
              "Make manual ingredient entry available when image recognition fails.",
              "Clarify model and provider errors in user-facing language.",
              "Improve responsive layouts and action hierarchy.",
          },
      },
      {
          "code-bug-analyzer",
          "Code Bug Analyzer",
          "Review the Refrigerator_09 codebase for defects, risky edge cases, and missing validation.",
          {
              "Inspect API error paths and malformed model responses.",
              "Check client-side empty states and destructive actions.",
              "Report issues before optimization and UX changes.",
          },
      },
      {
          "product-manager",
          "Product Manager",
          "Define product goals, feature scope, user requirements, and delivery priorities.",
          {
              "Maintain PRDs for image recognition, recipe generation, and saved profiles.",
              "Prioritize user value and acceptance criteria.",
              "Coordinate review feedback across specialist agents.",
          },
      },
      {
          "server-side-engineer",
          "Server-Side Development Expert",
          "Design stable backend APIs, data handling, integrations, security, and performance.",
          {
              "Build OpenRouter integrations without exposing secrets.",
              "Validate request bodies and normalize AI responses.",
              "Keep local development persistence isolated from source control.",
          },
      },
      {
          "client-side-engineer",
          "Client-Side Development Expert",
          "Implement accessible, responsive, high-performance user interfaces.",
          {
              "Connect upload, recipe, profile, and saved-recipe flows.",
              "Improve keyboard-friendly forms and meaningful empty states.",
              "Keep UI state predictable across retries.",
          },
      },
      {
          "quality-manager",
          "Quality Management Expert",
          "Test functionality, error handling, performance, review quality, and usability.",
          {
              "Verify API happy paths and failure paths.",
              "Check saved recipe create/read/delete behavior.",
              "Document residual risks and suggested regression tests.",
          },
      },
      {
          "llm-integration-expert",
          "LLM Integration Expert",
          "Integrate LLM services through OpenRouter, optimize prompts, and manage model behavior.",
          {
              "Use DeepSeek through OpenRouter for text generation and summarization.",
              "Keep prompts structured and request JSON-only responses when needed.",
              "Support model override configuration for provider availability.",
          },
      },
  };

  std::cout << "# Refrigerator_09 Agent Registry\n\n";
  for (const auto& agent : agents) {
    printAgent(agent);
  }

  std::cout << "# Recommended Review Workflow\n";
  std::cout << "1. code-bug-analyzer reviews the full application.\n";
  std::cout << "2. performance-optimizer fixes bottlenecks and latency risks.\n";
  std::cout << "3. ux-design-advisor improves the interaction and recovery paths.\n";
  std::cout << "4. quality-manager verifies the improved application.\n";

  return 0;
}
