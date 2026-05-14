type Directive =
  | {
      kind: "if";
      agents: string[];
    }
  | {
      kind: "endif";
    };

const linePattern = /[^\r\n]*(?:\r\n|\n|\r|$)/g;
const directivePattern = /^\s*<!--\s*agentic:(.*?)-->\s*$/;
const ifDirectivePattern = /^if\s+agent=(.*)$/;
const whitespacePattern = /\s/;

/**
 * Generates Markdown for a target agent by evaluating full-line `agentic:if`
 * comment blocks.
 *
 * Matching blocks are kept with their directive lines removed. Non-matching
 * blocks are removed entirely, while content outside conditional blocks is
 * preserved unchanged.
 *
 * @param agent - Target agent name.
 * @param markdown - Markdown source containing optional comment directives.
 * @returns Markdown filtered for the requested agent.
 * @throws If an `agentic:if` directive is malformed, nested, unclosed, or if
 * an `agentic:endif` directive appears without a matching `agentic:if`.
 *
 * @example
 * ```ts
 * import { render } from "agentic";
 *
 * const output = render("codex", markdown);
 * ```
 */
export function render(agent: string, markdown: string): string {
  const output: string[] = [];
  /* v8 ignore next -- linePattern always matches at least the zero-length EOF branch. */
  const lines = markdown.match(linePattern) ?? [];

  // Drop the zero-length EOF match produced by the trailing `$` branch in linePattern.
  /* v8 ignore else -- linePattern always ends with a zero-length EOF match. */
  if (lines.at(-1) === "") {
    lines.pop();
  }

  let blockMatches = false;
  let blockStartLine: number | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const directive = parseDirective(line, lineNumber);

    if (!directive) {
      if (blockStartLine === null || blockMatches) {
        output.push(line);
      }
      continue;
    }

    if (directive.kind === "if") {
      if (blockStartLine !== null) {
        throw new Error(`Nested agentic:if at line ${lineNumber} is not supported.`);
      }

      blockStartLine = lineNumber;
      blockMatches = directive.agents.includes(agent);
      continue;
    }

    if (blockStartLine === null) {
      throw new Error(`Unexpected agentic:endif at line ${lineNumber} without a matching agentic:if.`);
    }

    blockStartLine = null;
    blockMatches = false;
  }

  if (blockStartLine !== null) {
    throw new Error(`Unclosed agentic:if starting at line ${blockStartLine}.`);
  }

  return output.join("");
}

function parseDirective(line: string, lineNumber: number): Directive | undefined {
  const match = directivePattern.exec(line);

  if (!match) {
    return;
  }

  /* v8 ignore next -- directivePattern always creates the capture group when it matches. */
  const body = match[1]?.trim() ?? "";

  if (body === "endif") {
    return { kind: "endif" };
  }

  if (body.startsWith("if")) {
    const ifMatch = ifDirectivePattern.exec(body);

    if (!ifMatch) {
      throwInvalidIfDirective(lineNumber);
    }

    const agents = ifMatch[1].split(",").map((name) => name.trim());

    if (agents.length === 0 || agents.some((agent) => agent === "" || whitespacePattern.test(agent))) {
      throwInvalidIfDirective(lineNumber);
    }

    return { kind: "if", agents };
  }

  throw new Error(`Invalid agentic directive at line ${lineNumber}. Expected agentic:if or agentic:endif.`);
}

function throwInvalidIfDirective(lineNumber: number): never {
  throw new Error(
    `Invalid agentic:if directive at line ${lineNumber}. Expected: <!-- agentic:if agent=codex,claude -->`,
  );
}
