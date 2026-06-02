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

  it("throws for an unclosed non-matching condition block at the end of the document", () => {
    const markdown = ["Before.", "<!-- agentic:if agent=codex -->", "Codex-only content."].join("\n");

    expect(() => render(markdown, { agent: "claude" })).toThrow("Unclosed agentic:if starting at line 2");
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

  it("keeps presence-only condition blocks when the variable has a value", () => {
    const markdown = ["<!-- agentic:if projectName -->", "Project content.", "<!-- agentic:endif -->", ""].join("\n");

    expect(render(markdown, { projectName: "agentic-markdown" })).toBe("Project content.\n");
  });

  it("removes presence-only condition blocks when the variable is missing or empty", () => {
    const markdown = [
      "Before.",
      "<!-- agentic:if projectName -->",
      "Project content.",
      "<!-- agentic:endif -->",
      "After.",
      "",
    ].join("\n");

    expect(render(markdown)).toBe("Before.\nAfter.\n");
    expect(render(markdown, { projectName: "" })).toBe("Before.\nAfter.\n");
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

  it("keeps the first matching branch in condition chains", () => {
    const markdown = [
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:elseif agent=claude -->",
      "Claude-only content.",
      "<!-- agentic:elseif target=docs -->",
      "Docs-only content.",
      "<!-- agentic:else -->",
      "Fallback content.",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(render(markdown, { agent: "codex", target: "docs" })).toBe("Codex-only content.\n");
    expect(render(markdown, { agent: "claude", target: "docs" })).toBe("Claude-only content.\n");
    expect(render(markdown, { agent: "gemini", target: "docs" })).toBe("Docs-only content.\n");
    expect(render(markdown, { agent: "gemini", target: "readme" })).toBe("Fallback content.\n");
  });

  it("supports inline elseif and else branches", () => {
    const markdown =
      "Use <!-- agentic:if agent=codex -->Codex<!-- agentic:elseif agent=claude -->Claude<!-- agentic:else -->another agent<!-- agentic:endif --> instructions.\n";

    expect(render(markdown, { agent: "codex" })).toBe("Use Codex instructions.\n");
    expect(render(markdown, { agent: "claude" })).toBe("Use Claude instructions.\n");
    expect(render(markdown, { agent: "gemini" })).toBe("Use another agent instructions.\n");
  });

  it("keeps matching inline condition spans", () => {
    const markdown = "A <!-- agentic:if agent=codex -->B<!-- agentic:endif --> C\n";

    expect(render(markdown, { agent: "codex" })).toBe("A B C\n");
  });

  it("removes a standalone condition comment at the end of the document", () => {
    const markdown = "Before.\n<!-- agentic:if agent=codex -->";

    expect(() => render(markdown, { agent: "codex" })).toThrow("Unclosed agentic:if starting at line 2");
  });

  it("removes standalone condition directive lines with CRLF line endings", () => {
    const markdown =
      "Before.\r\n<!-- agentic:if agent=codex -->\r\nCodex-only content.\r\n<!-- agentic:endif -->\r\nAfter.\r\n";

    expect(render(markdown, { agent: "codex" })).toBe("Before.\r\nCodex-only content.\r\nAfter.\r\n");
  });

  it("keeps same-line content after standalone-looking condition comments", () => {
    const markdown = "<!-- agentic:if agent=codex --> B\nC<!-- agentic:endif --> D\n";

    expect(render(markdown, { agent: "codex" })).toBe(" B\nC D\n");
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

  it("does not evaluate variables in skipped condition chain branches", () => {
    const markdown = [
      "<!-- agentic:if agent=codex -->",
      "Codex content.",
      "<!-- agentic:elseif agent=claude -->",
      "<!-- agentic:var missingProjectName -->",
      "<!-- agentic:else -->",
      "<!-- agentic:var missingFallback -->",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(render(markdown, { agent: "codex" })).toBe("Codex content.\n");
  });

  it("throws for an isolated endif directive", () => {
    expect(() => render("<!-- agentic:endif -->\n")).toThrow("Unexpected agentic:endif at line 1");
  });

  it("throws for isolated condition chain branch directives", () => {
    expect(() => render("<!-- agentic:elseif agent=codex -->\n")).toThrow(
      "Unexpected agentic:elseif at line 1 without a matching agentic:if",
    );
    expect(() => render("<!-- agentic:else -->\n")).toThrow(
      "Unexpected agentic:else at line 1 without a matching agentic:if",
    );
  });

  it("throws for endif directives with arguments", () => {
    expect(() => render("<!-- agentic:if agent=codex -->\n<!-- agentic:endif agent -->\n", { agent: "codex" })).toThrow(
      "Invalid agentic directive at line 2",
    );
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

  it("throws for invalid elseif directives", () => {
    const markdown = [
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:elseif agent= -->",
      "Claude-only content.",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(() => render(markdown, { agent: "codex" })).toThrow("Invalid agentic:elseif directive at line 3");
  });

  it("throws for else directives with arguments", () => {
    const markdown = [
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:else agent=claude -->",
      "Claude-only content.",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(() => render(markdown, { agent: "claude" })).toThrow("Invalid agentic directive at line 3");
  });

  it("throws for duplicate else branches", () => {
    const markdown = [
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:else -->",
      "Fallback content.",
      "<!-- agentic:else -->",
      "Duplicate fallback content.",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(() => render(markdown, { agent: "gemini" })).toThrow("Duplicate agentic:else at line 5");
  });

  it("throws for elseif branches after else", () => {
    const markdown = [
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:else -->",
      "Fallback content.",
      "<!-- agentic:elseif agent=claude -->",
      "Claude-only content.",
      "<!-- agentic:endif -->",
      "",
    ].join("\n");

    expect(() => render(markdown, { agent: "claude" })).toThrow(
      "Unexpected agentic:elseif at line 5 after agentic:else",
    );
  });

  it("removes value condition blocks when the variable is missing", () => {
    const markdown = [
      "Before.",
      "<!-- agentic:if agent=codex -->",
      "Codex-only content.",
      "<!-- agentic:endif -->",
      "After.",
      "",
    ].join("\n");

    expect(render(markdown)).toBe("Before.\nAfter.\n");
  });

  it("throws for unknown agentic directives", () => {
    expect(() => render("<!-- agentic:unknown -->\n")).toThrow("Invalid agentic directive at line 1");
  });

  it("throws for missing variables", () => {
    expect(() => render("<!-- agentic:var projectName -->\n")).toThrow('Missing agentic:var "projectName" at line 1');
  });

  it("throws for malformed variable directives", () => {
    expect(() => render("<!-- agentic:var  -->\n")).toThrow("Invalid agentic:var directive at line 1");
    expect(() => render("<!-- agentic:var project name -->\n")).toThrow("Invalid agentic:var directive at line 1");
  });
});
