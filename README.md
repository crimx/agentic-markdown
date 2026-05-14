# agentic-markdown

[![Docs](https://img.shields.io/badge/Docs-read-%23fdf9f5)](https://crimx.github.io/agentic-markdown)
[![Build Status](https://github.com/crimx/agentic-markdown/actions/workflows/build.yml/badge.svg)](https://github.com/crimx/agentic-markdown/actions/workflows/build.yml)
[![npm-version](https://img.shields.io/npm/v/agentic-markdown.svg)](https://www.npmjs.com/package/agentic-markdown)
[![Coverage Status](https://crimx.github.io/agentic-markdown/coverage-badges/agentic-markdown.svg)](https://crimx.github.io/agentic-markdown/coverage/)
[![minified-size](https://img.shields.io/bundlephobia/minzip/agentic-markdown)](https://bundlephobia.com/package/agentic-markdown)

Render agent-specific Markdown from conditional HTML comment blocks.

## Install

```bash
npm add agentic-markdown
```

## Usage

```ts
import { render } from "agentic-markdown";

const markdown = `Common content.

<!-- agentic:if agent=codex -->
Codex-only content.
<!-- agentic:endif -->

<!-- agentic:if agent=claude,gemini -->
Claude and Gemini content.
<!-- agentic:endif -->
`;

const output = render("codex", markdown);
```

`output`:

```md
Common content.

Codex-only content.
```

## Syntax

Use full-line HTML comments to mark agent-specific Markdown blocks:

```md
<!-- agentic:if agent=codex -->
Codex-only content.
<!-- agentic:endif -->
```

The `agent=` value is a comma-separated list. Whitespace around each agent name is ignored, and matching is
case-sensitive.

```ts
render("codex", markdown);
```

A block is kept when the requested agent appears in its `agent=` list.

Directives must be on their own line. Inline HTML comments are treated as normal Markdown content. Nested condition
blocks are not supported in this first version; malformed blocks throw an error.
