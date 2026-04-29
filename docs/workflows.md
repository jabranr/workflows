# Workflow Authoring Guide

How to add, modify, and test reusable workflows in this repository.

## Repository Layout

```
.github/
├── actions/
│   ├── actionlint/
│   │   └── action.yml          # Lint workflows with actionlint
│   └── wait-cf-pages-deployment/
│       ├── action.yml                     # Composite action entrypoint
│       └── wait-cf-pages-deployment.cjs  # Helper loaded by actions/github-script
└── workflows/
    ├── reusable-integration.yml
    ├── reusable-pr-checks.yml
    ├── reusable-npm-publish.yml
    └── reusable-lighthouse.yml
```

Reusable workflows live under `.github/workflows/` and use `on: workflow_call:` as their sole trigger. Composite actions live under `.github/actions/`, use `runs: using: 'composite'`, and may include helper files alongside `action.yml`.

## Adding a New Workflow

1. Create `.github/workflows/reusable-<name>.yml`.
2. Name the file with the `reusable-` prefix and use kebab-case.
3. The workflow **must** use `on: workflow_call:` as its sole trigger.
4. Follow the standard structure below.

### Standard Skeleton

```yaml
name: Reusable <Title>

on:
  workflow_call:
    inputs:
      node-version:
        description: 'Node.js version to use'
        type: number
        default: 24
      # add further inputs here
    secrets:
      # add secrets here

permissions:
  contents: read # tighten to the minimum required

jobs:
  <job-id>:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: 'npm'
      - run: npm ci
```

## Standard CI Step Order

Every workflow that runs tests must use this **exact step order**:

```yaml
- run: npm ci
- run: npm test
- run: npm run build
- run: npm run lint
- run: npm run format:check
- run: npm run typecheck
```

Do not skip or reorder these steps. Callers rely on them running in this sequence.

## npm Publishing Requirements

When a workflow step publishes to npm, these conditions must all be met:

| Requirement                                                          | Reason                                             |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| `registry-url: https://registry.npmjs.org/` in `setup-node`          | Required for `NODE_AUTH_TOKEN` to be picked up     |
| `env: NODE_AUTH_TOKEN: ${{ secrets.npm-token }}` on the publish step | Auth for the npm registry                          |
| `fetch-depth: 0` in `checkout`                                       | Required for conventional-commit history traversal |
| `token: ${{ secrets.github-token }}` in `checkout`                   | Required when the job pushes commits or tags       |
| `HUSKY: 0` on versioning steps                                       | Prevents git hooks from blocking version commits   |

## Supporting Both Monorepo and Simple Repo

Pair every publishing step with an equivalent using `if:` conditions:

```yaml
- name: do thing with Lerna (monorepo)
  if: ${{ inputs.use-lerna }}
  run: npx lerna ...

- name: do thing with npm (simple repo)
  if: ${{ !inputs.use-lerna }}
  run: npm ...
```

Keep the Lerna step first. Keep paired steps adjacent.

## Permissions

Declare the minimum required `permissions:` at the workflow level:

- Read-only workflows: `contents: read` (default; can be omitted).
- Workflows that push commits or tags: `contents: write`.
- Never grant `write-all` or omit permissions on publishing workflows.

## Referencing a Composite Action from a Caller Repository

Composite actions are referenced in a step's `uses:` field, not in `jobs.<id>.uses:`:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: jabranr/workflows/.github/actions/actionlint@main
  - uses: jabranr/workflows/.github/actions/wait-cf-pages-deployment@main
```

- Always pin to `@main`.
- Composite actions accept no inputs and expose no secrets unless their `action.yml` declares them.
- Keep helper files in the same action directory as `action.yml`.
- Because this repository sets `"type": "module"` in `package.json`, helper files loaded via `require()` from `actions/github-script` must use the `.cjs` extension.

## Referencing a Workflow from a Caller Repository

```yaml
jobs:
  pr-checks:
    uses: jabranr/workflows/.github/workflows/reusable-pr-checks.yml@main
    with:
      node-version: 24
      use-lerna: false
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
```

- Always pin to `@main` (this repo has no versioned releases of its own).
- Pass only the secrets the callee declares — GitHub will error on undeclared secrets.

## Validating Workflow YAML Locally

Install the dev dependencies once:

```bash
npm install
```

Check formatting with Prettier:

```bash
npm run format:check   # report issues
npm run format         # rewrite files in place
```

Validate YAML syntax with:

```bash
npx js-yaml .github/workflows/reusable-pr-checks.yml
```

Or install `actionlint` for full GitHub Actions semantic validation:

```bash
brew install actionlint
actionlint
```

## Updating README.md

After adding or changing a workflow, update `README.md` to reflect the new inputs, secrets, and behaviour. The README is the consumer-facing reference.
