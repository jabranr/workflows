# AGENTS.md

A library of reusable GitHub Actions workflows for JavaScript/Node.js projects, callable via `workflow_call`.

## Quick Facts

|                      |                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Language**         | YAML only — no compiled or interpreted source code                                  |
| **Package manager**  | `npm` (package.json exists for dev tooling only — Prettier, SecureCI)               |
| **Local build/test** | `npm run format:check`, `npm run ci:validate`, `npm run ci:inventory`, `actionlint` |
| **Default Node.js**  | 24                                                                                  |
| **Versioning**       | Conventional Commits → automated via `reusable-npm-publish.yml`                     |

## Codebase Map

```
.github/workflows/
├── reusable-pr-checks.yml      # CI checks + optional pre-release on [publish]
├── reusable-npm-publish.yml    # Production versioning + npm publish
├── reusable-integration.yml    # Playwright functional/e2e/smoke/vr tests
└── secureci.yml                # This repo's CI: SecureCI validate + inventory check
.github/actions/                # Composite actions (actionlint, cf-pages-preview-url, performance-audit, wait-cf-pages-deployment)
secureci.lock                   # Locked commit SHAs for every action in use
docs/
├── workflows.md                # How to add / modify workflows
├── git-workflow.md             # Commit conventions, branching, [publish] trigger
└── yaml-style.md              # YAML formatting and naming rules
```

## Critical Rules (apply to every task)

1. **Every reusable workflow** lives in `.github/workflows/` and uses `on: workflow_call:` as its only trigger. The one exception is `secureci.yml`, this repo's own CI.
2. **Conventional commits are mandatory** — automated versioning parses the git log.
3. **Do not create version tags manually** — the publish workflow creates them.
4. **`HUSKY: 0`** must be set on any step that runs `npm version` or `npx lerna version`.
5. **`fetch-depth: 0`** is required on `checkout` steps that run conventional-commit tooling.
6. **Jobs run on `${{ inputs.runner }}`** (default `ubuntu-24.04`), never a hard-coded `ubuntu-latest`.
7. **Pin every `uses:` to a full commit SHA** with the version as a comment (`@<sha> # v4.4.0`), never a bare tag, branch or `@latest`. Self-references to this repo use the `main` SHA (`@<sha> # main`). Run `npm run ci:inventory:update` and commit `secureci.lock` after any pin change; CI (`secureci.yml`) fails on drift.

## Detailed Guidance

- [Workflow authoring patterns](docs/workflows.md) — structure, CI step order, publishing requirements, Lerna vs npm branching
- [YAML style](docs/yaml-style.md) — indentation, quoting, naming conventions
- [Git workflow](docs/git-workflow.md) — commit types, the `[publish]` pre-release trigger, tagging rules
