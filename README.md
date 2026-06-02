# agentic-markdown

[![Build Status](https://github.com/crimx/agentic-markdown/actions/workflows/build.yml/badge.svg)](https://github.com/crimx/agentic-markdown/actions/workflows/build.yml)
[![npm-version](https://img.shields.io/npm/v/agentic-markdown.svg)](https://www.npmjs.com/package/agentic-markdown)
[![Coverage Status](https://crimx.github.io/agentic-markdown/coverage-badges/agentic-markdown.svg)](https://crimx.github.io/agentic-markdown/coverage/)
[![minified-size](https://deno.bundlejs.com/badge?q=agentic-markdown&treeshake=[*])](https://bundlejs.com/?q=agentic-markdown&treeshake=%5B*%5D)

Render variable-aware Markdown from conditional HTML comment blocks.

## Install

```bash
npm add agentic-markdown
```

## Usage

```ts
import { render } from "agentic-markdown";

const markdown = `Common content.

Project: <!-- agentic:var projectName -->

<!-- agentic:if agent=codex -->
Codex-only content.
<!-- agentic:endif -->

<!-- agentic:if agent=claude|gemini -->
Claude and Gemini content.
<!-- agentic:endif -->
`;

const output = render(markdown, {
  agent: "codex",
  projectName: "agentic-markdown",
});
```

`output`:

```md
Common content.

Project: agentic-markdown

Codex-only content.
```

## Syntax

Use HTML comments to mark variable-specific Markdown spans:

```md
<!-- agentic:if agent=codex -->
Codex-only content.
<!-- agentic:elseif agent=claude -->
Claude-only content.
<!-- agentic:else -->
Other-agent content.
<!-- agentic:endif -->
```

They may also appear inline:

```md
Use <!-- agentic:if agent=codex -->Codex<!-- agentic:endif --> instructions.
```

The `agentic:if` and `agentic:elseif` values are either `variable=value` conditions or presence/non-empty checks. Use
`|` to match any of multiple values. Matching is case-sensitive. `agentic:else` accepts no condition and is kept only
when no previous branch in the chain matched.

```ts
render(markdown, { agent: "codex" });
```

A `variable=value` block is kept when the configured variable matches one of the expected values. Missing variables are
treated as non-matches instead of errors.

Omit `=` to keep a block when the configured variable has a non-empty value. Missing or empty variables are also treated
as non-matches:

```md
<!-- agentic:if projectName -->
Project-specific content.
<!-- agentic:endif -->
```

Use `agentic:var` comments to replace variables. They may appear inline or on their own line:

```md
Project: <!-- agentic:var projectName -->
```

```ts
render(markdown, {
  projectName: "agentic-markdown",
});
```

`agentic:var` requires the variable to be configured. Missing variables throw an error.

When condition comments are on their own line, the whole directive line is removed. Inline condition comments only
remove the comment itself, or the excluded span when the condition does not match. Nested condition blocks are not
supported; malformed blocks throw an error.
