import { describe, expect, it } from "vitest";
import { render } from ".";

describe("render", () => {
  it("returns markdown without condition blocks unchanged", () => {
    const markdown = "Common content.\n\nMore content.\n";

    expect(render("codex", markdown)).toBe(markdown);
  });

  it("keeps matching single-agent blocks and removes directive lines", () => {
    const markdown = [
      "Common content.",
      "",
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:endif -->",
      "",
      "Tail.",
      "",
    ].join("\n");

    expect(render("codex", markdown)).toBe("Common content.\n\nCodex-only content.\n\nTail.\n");
  });

  it("removes non-matching single-agent blocks", () => {
    const markdown = [
      "Common content.",
      "",
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:endif -->",
      "",
      "Tail.",
      "",
    ].join("\n");

    expect(render("claude", markdown)).toBe("Common content.\n\n\nTail.\n");
  });

  it("keeps blocks when any directive agent matches", () => {
    const markdown = [
      "<!-- agentic:if agent=claude,codex -->",
      "Claude and Codex content.",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(render("codex", markdown)).toBe("Claude and Codex content.\n");
  });

  it("handles multiple independent condition blocks", () => {
    const markdown = [
      "Common content.",
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:endif -->",
      "<!-- agentic:if agent=claude -->",
      "Claude-only content.",
      "<!-- agentic:endif -->",
      "Tail.",
      "",
    ].join("\n");

    expect(render("codex", markdown)).toBe("Common content.\nCodex-only content.\nTail.\n");
  });

  it("throws for an isolated endif directive", () => {
    expect(() => render("codex", "<!-- agentic:endif -->\n")).toThrow("Unexpected agentic:endif at line 1");
  });

  it("throws for an unclosed if directive", () => {
    expect(() => render("codex", "<!-- agentic:if agent=codex -->\nCodex-only content.\n")).toThrow(
      "Unclosed agentic:if starting at line 1",
    );
  });

  it("throws for nested if directives", () => {
    const markdown = [
      "<!-- agentic:if agent=codex -->",
      "<!-- agentic:if agent=claude -->",
      "Nested content.",
      "<!-- agentic:endif -->",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(() => render("codex", markdown)).toThrow("Nested agentic:if at line 2");
  });

  it("throws for invalid if directives", () => {
    expect(() => render("codex", "<!-- agentic:if agent= -->\n")).toThrow("Invalid agentic:if directive at line 1");
  });

  it("throws for malformed if directives that omit the required agent field", () => {
    expect(() => render("codex", "<!-- agentic:if agents=codex -->\n")).toThrow(
      "Invalid agentic:if directive at line 1",
    );
  });

  it("throws for unknown agentic directives", () => {
    expect(() => render("codex", "<!-- agentic:else -->\n")).toThrow("Invalid agentic directive at line 1");
  });
});
