# AGENTS.md

A library of reusable GitHub Actions workflows for JavaScript/Node.js projects, callable via `workflow_call`.

## Quick Facts

|                      |                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------ |
| **Language**         | YAML only — no compiled or interpreted source code                                   |
| **Package manager**  | `npm` (package.json exists for dev tooling only — Prettier)                          |
| **Local build/test** | `npm run format:check` and `actionlint` (see [docs/workflows.md](docs/workflows.md)) |
| **Default Node.js**  | 24                                                                                   |
| **Versioning**       | Conventional Commits → automated via `reusable-npm-publish.yml`                      |

## Codebase Map

```
.github/workflows/
├── reusable-pr-checks.yml      # CI checks + optional pre-release on [publish]
└── reusable-npm-publish.yml    # Production versioning + npm publish
docs/
├── workflows.md                # How to add / modify workflows
├── git-workflow.md             # Commit conventions, branching, [publish] trigger
└── yaml-style.md              # YAML formatting and naming rules
```

## Critical Rules (apply to every task)

1. **Every file** lives in `.github/workflows/` and uses `on: workflow_call:` as its only trigger.
2. **Conventional commits are mandatory** — automated versioning parses the git log.
3. **Do not create version tags manually** — the publish workflow creates them.
4. **`HUSKY: 0`** must be set on any step that runs `npm version` or `npx lerna version`.
5. **`fetch-depth: 0`** is required on `checkout` steps that run conventional-commit tooling.
6. **Pin actions to major version tags** (`@v4`), never `@latest` or a SHA.

## Detailed Guidance

- [Workflow authoring patterns](docs/workflows.md) — structure, CI step order, publishing requirements, Lerna vs npm branching
- [YAML style](docs/yaml-style.md) — indentation, quoting, naming conventions
- [Git workflow](docs/git-workflow.md) — commit types, the `[publish]` pre-release trigger, tagging rules
