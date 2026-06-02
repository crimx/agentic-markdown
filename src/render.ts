const agenticCommentPattern = /<!--\s*agentic:(\S+)(?:\s+([\s\S]*?))?\s*-->/g;
const lineBreakPattern = /\r\n|\r|\n/;
const lineWhitespacePattern = /^[^\S\r\n]*$/;
const whitespacePattern = /\s/;

export type RenderVariables = Record<string, string>;

/**
 * Renders a Markdown-first template by evaluating `agentic:if`/`agentic:elseif`/
 * `agentic:else` comments and replacing `agentic:var` comments from a shared
 * variable map.
 *
 * Matching blocks are kept with their directive comments removed. Non-matching
 * blocks are removed entirely, while kept content is preserved with any
 * `agentic:var` comments replaced by configured variables.
 *
 * @param markdown - Markdown template containing optional comment directives.
 * @param variables - Variables used by condition and `agentic:var`
 * directives.
 * @returns Rendered Markdown.
 * @throws If an `agentic:if` directive is malformed, nested, unclosed, or if a
 * branch/`agentic:endif` directive appears without a matching `agentic:if`.
 * Also throws if an emitted `agentic:var` directive references a missing
 * variable.
 *
 * @example
 * ```ts
 * import { render } from "agentic-markdown";
 *
 * const output = render(markdown, {
 *   agent: "codex",
 *   projectName: "agentic-markdown",
 * });
 * ```
 */
export function render(markdown: string, variables: RenderVariables = {}): string {
  const output: string[] = [];
  let cursor = 0;
  let blockMatches = true;
  let blockHasMatched = false;
  let blockHasElse = false;
  let blockStartLine: number | null = null;
  let match: RegExpExecArray | null;

  agenticCommentPattern.lastIndex = 0;

  while ((match = agenticCommentPattern.exec(markdown))) {
    const [comment, directive = "", args = ""] = match;
    const lineNumber = getLineNumber(markdown, match.index);
    const isControlDirective = ["if", "elseif", "else", "endif"].includes(directive);
    const span = isControlDirective
      ? getControlDirectiveSpan(markdown, match.index, match.index + comment.length)
      : { start: match.index, end: match.index + comment.length };

    if (blockStartLine === null || blockMatches) {
      output.push(markdown.slice(cursor, span.start));
    }

    cursor = span.end;

    if (directive === "if") {
      if (blockStartLine !== null) {
        throw new Error(`Nested agentic:if at line ${lineNumber} is not supported.`);
      }

      blockStartLine = lineNumber;
      blockMatches = matchesCondition(args, variables, lineNumber);
      blockHasMatched = blockMatches;
      blockHasElse = false;
      continue;
    }

    if (directive === "elseif") {
      if (blockStartLine === null) {
        throw new Error(`Unexpected agentic:elseif at line ${lineNumber} without a matching agentic:if.`);
      }

      if (blockHasElse) {
        throw new Error(`Unexpected agentic:elseif at line ${lineNumber} after agentic:else.`);
      }

      const branchMatches = matchesCondition(args, variables, lineNumber, directive);
      blockMatches = !blockHasMatched && branchMatches;
      blockHasMatched ||= branchMatches;
      continue;
    }

    if (directive === "else") {
      if (args.trim() !== "") {
        throwInvalidDirective(lineNumber);
      }

      if (blockStartLine === null) {
        throw new Error(`Unexpected agentic:else at line ${lineNumber} without a matching agentic:if.`);
      }

      if (blockHasElse) {
        throw new Error(`Duplicate agentic:else at line ${lineNumber}.`);
      }

      blockHasElse = true;
      blockMatches = !blockHasMatched;
      blockHasMatched = true;
      continue;
    }

    if (directive === "endif") {
      if (args.trim() !== "") {
        throw new Error(
          `Invalid agentic directive at line ${lineNumber}. Expected agentic:if, agentic:endif, or agentic:var.`,
        );
      }

      if (blockStartLine === null) {
        throw new Error(`Unexpected agentic:endif at line ${lineNumber} without a matching agentic:if.`);
      }

      blockStartLine = null;
      blockMatches = true;
      blockHasMatched = false;
      blockHasElse = false;
      continue;
    }

    if (directive === "var") {
      if (blockStartLine === null || blockMatches) {
        output.push(getVariableValue(args, variables, lineNumber));
      }
      continue;
    }

    throwInvalidDirective(lineNumber);
  }

  if (blockStartLine === null || blockMatches) {
    output.push(markdown.slice(cursor));
  }

  if (blockStartLine !== null) {
    throw new Error(`Unclosed agentic:if starting at line ${blockStartLine}.`);
  }

  return output.join("");
}

function matchesCondition(args: string, variables: RenderVariables, lineNumber: number, directive = "if"): boolean {
  const parts = args.trim().split("=");
  const [name, valueList] = parts;

  if (parts.length > 2 || isInvalidName(name)) {
    throwInvalidConditionDirective(lineNumber, directive);
  }

  const value = variables[name];

  if (valueList === undefined) {
    return value !== undefined && value !== "";
  }

  const expectedValues = valueList.split("|");

  if (expectedValues.some(isInvalidValue)) {
    throwInvalidConditionDirective(lineNumber, directive);
  }

  return expectedValues.includes(value);
}

function getVariableValue(args: string, variables: RenderVariables, lineNumber: number): string {
  const name = args.trim();

  if (isInvalidName(name)) {
    throwInvalidVarDirective(lineNumber);
  }

  const value = variables[name];

  if (value === undefined) {
    throw new Error(`Missing agentic:var "${name}" at line ${lineNumber}.`);
  }

  return value;
}

function isInvalidName(value: string): boolean {
  return value === "" || whitespacePattern.test(value) || value.includes("=") || value.includes("|");
}

function isInvalidValue(value: string): boolean {
  return value === "" || whitespacePattern.test(value) || value.includes("=");
}

function getLineNumber(markdown: string, index: number): number {
  return markdown.slice(0, index).split(lineBreakPattern).length;
}

function getControlDirectiveSpan(markdown: string, start: number, end: number): { start: number; end: number } {
  const lineStart = Math.max(markdown.lastIndexOf("\n", start - 1), markdown.lastIndexOf("\r", start - 1)) + 1;

  if (!lineWhitespacePattern.test(markdown.slice(lineStart, start))) {
    return { start, end };
  }

  let lineEnd = end;

  while (lineEnd < markdown.length && markdown[lineEnd] !== "\n" && markdown[lineEnd] !== "\r") {
    if (!lineWhitespacePattern.test(markdown[lineEnd])) {
      return { start, end };
    }

    lineEnd += 1;
  }

  if (lineEnd < markdown.length) {
    lineEnd += markdown[lineEnd] === "\r" && markdown[lineEnd + 1] === "\n" ? 2 : 1;
  }

  return { start: lineStart, end: lineEnd };
}

function throwInvalidConditionDirective(lineNumber: number, directive: string): never {
  throw new Error(
    `Invalid agentic:${directive} directive at line ${lineNumber}. Expected: <!-- agentic:${directive} agent=codex|claude --> or <!-- agentic:${directive} agent -->`,
  );
}

function throwInvalidVarDirective(lineNumber: number): never {
  throw new Error(`Invalid agentic:var directive at line ${lineNumber}. Expected: <!-- agentic:var projectName -->`);
}

function throwInvalidDirective(lineNumber: number): never {
  throw new Error(
    `Invalid agentic directive at line ${lineNumber}. Expected agentic:if, agentic:elseif, agentic:else, agentic:endif, or agentic:var.`,
  );
}
