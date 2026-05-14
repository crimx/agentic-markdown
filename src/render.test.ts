import { describe, expect, it } from "vitest";
import { render } from ".";

describe("render", () => {
  it("returns markdown without condition blocks unchanged", () => {
    const markdown = "Common content.\n\nMore content.\n";

    expect(render(markdown)).toBe(markdown);
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

    expect(render(markdown, { agent: "codex" })).toBe("Common content.\n\nCodex-only content.\n\nTail.\n");
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

    expect(render(markdown, { agent: "claude" })).toBe("Common content.\n\n\nTail.\n");
  });

  it("keeps blocks when any expected variable value matches", () => {
    const markdown = [
      "<!-- agentic:if agent=claude|codex -->",
      "Claude and Codex content.",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(render(markdown, { agent: "codex" })).toBe("Claude and Codex content.\n");
  });

  it("matches non-agent variables", () => {
    const markdown = ["<!-- agentic:if target=docs|readme -->", "Docs content.", "<!-- agentic:endif -->", ""].join(
      "\n",
    );

    expect(render(markdown, { target: "docs" })).toBe("Docs content.\n");
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

    expect(render(markdown, { agent: "codex" })).toBe("Common content.\nCodex-only content.\nTail.\n");
  });

  it("keeps matching inline condition spans", () => {
    const markdown = "A <!-- agentic:if agent=codex -->B<!-- agentic:endif --> C\n";

    expect(render(markdown, { agent: "codex" })).toBe("A B C\n");
  });

  it("removes non-matching inline condition spans", () => {
    const markdown = "A <!-- agentic:if agent=codex -->B<!-- agentic:endif --> C\n";

    expect(render(markdown, { agent: "claude" })).toBe("A  C\n");
  });

  it("removes non-matching multiline inline condition spans", () => {
    const markdown = "A <!-- agentic:if agent=codex -->B\nC<!-- agentic:endif --> D\n";

    expect(render(markdown, { agent: "claude" })).toBe("A  D\n");
  });

  it("replaces inline variables", () => {
    const markdown = "Project: <!-- agentic:var projectName -->\n";

    expect(render(markdown, { projectName: "agentic-markdown" })).toBe("Project: agentic-markdown\n");
  });

  it("replaces multiple variables on one line", () => {
    const markdown = "<!-- agentic:var greeting -->, <!-- agentic:var name -->.\n";

    expect(render(markdown, { greeting: "Hello", name: "Codex" })).toBe("Hello, Codex.\n");
  });

  it("replaces full-line variables", () => {
    const markdown = "<!-- agentic:var projectName -->\n";

    expect(render(markdown, { projectName: "agentic-markdown" })).toBe("agentic-markdown\n");
  });

  it("does not evaluate variables in non-matching blocks", () => {
    const markdown = [
      "<!-- agentic:if agent=claude -->",
      "<!-- agentic:var missingProjectName -->",
      "<!-- agentic:endif -->",
      "Tail.",
      "",
    ].join("\n");

    expect(render(markdown, { agent: "codex" })).toBe("Tail.\n");
  });

  it("throws for an isolated endif directive", () => {
    expect(() => render("<!-- agentic:endif -->\n")).toThrow("Unexpected agentic:endif at line 1");
  });

  it("throws for an unclosed if directive", () => {
    expect(() => render("<!-- agentic:if agent=codex -->\nCodex-only content.\n", { agent: "codex" })).toThrow(
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

    expect(() => render(markdown, { agent: "codex" })).toThrow("Nested agentic:if at line 2");
  });

  it("throws for invalid if directives", () => {
    expect(() => render("<!-- agentic:if agent= -->\n")).toThrow("Invalid agentic:if directive at line 1");
    expect(() => render("<!-- agentic:if agent codex -->\n")).toThrow("Invalid agentic:if directive at line 1");
  });

  it("throws for missing if variables", () => {
    expect(() => render("<!-- agentic:if agent=codex -->\nCodex-only content.\n<!-- agentic:endif -->\n")).toThrow(
      'Missing agentic:if variable "agent" at line 1',
    );
  });

  it("throws for unknown agentic directives", () => {
    expect(() => render("<!-- agentic:else -->\n")).toThrow("Invalid agentic directive at line 1");
  });

  it("throws for missing variables", () => {
    expect(() => render("<!-- agentic:var projectName -->\n")).toThrow('Missing agentic:var "projectName" at line 1');
  });

  it("throws for malformed variable directives", () => {
    expect(() => render("<!-- agentic:var  -->\n")).toThrow("Invalid agentic:var directive at line 1");
    expect(() => render("<!-- agentic:var project name -->\n")).toThrow("Invalid agentic:var directive at line 1");
  });
});
