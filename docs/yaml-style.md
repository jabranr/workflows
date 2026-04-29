# YAML Style Guide

Conventions for authoring workflow files in this repository.

## Formatting

- **Indentation:** 2 spaces — no tabs.
- **Line length:** Keep lines under 120 characters. Break long `run:` scripts with `|` block scalars.
- **Blank lines:** One blank line between top-level keys (`on:`, `permissions:`, `jobs:`). One blank line between jobs.
- **Trailing whitespace:** None.

## Strings and Quoting

- Quote any string that contains `${{`, `:`, `#`, `*`, `[`, or `{`.
- Use single quotes for plain strings: `'ubuntu-latest'`.
- Use double quotes only when the string contains a single quote or a GitHub expression: `"${{ inputs.node-version }}"`.
- Do **not** quote booleans or numbers — write `true`, `false`, `24`, not `'true'` or `'24'`.

## Action Pinning

- Pin all `uses:` references to a **major version tag** (`@v4`), not `@latest` or a SHA.

  ```yaml
  # ✅ correct
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4

  # ❌ avoid
  - uses: actions/checkout@main
  - uses: actions/checkout@abc1234def
  ```

## Naming Conventions

| Element          | Convention              | Example                                        |
| ---------------- | ----------------------- | ---------------------------------------------- |
| Workflow `name:` | Title Case              | `Reusable PR Checks`                           |
| Job id           | kebab-case              | `test-and-build`                               |
| Step `name:`     | Sentence case, verb-led | `configure git`, `version packages with Lerna` |
| Input key        | kebab-case              | `node-version`, `use-lerna`                    |
| Secret key       | kebab-case              | `npm-token`, `github-token`                    |
| Env var          | UPPER_SNAKE_CASE        | `NODE_AUTH_TOKEN`, `HUSKY`                     |
| Step `id:`       | kebab-case              | `fetch-short-sha`, `check`                     |

## Inputs and Secrets

- Every input must have a `description:`, `type:`, and `default:` (unless no sensible default exists).
- Every secret must have a `description:` and explicit `required: true` or `required: false`.

  ```yaml
  inputs:
    node-version:
      description: 'Node.js version to use'
      type: number
      default: 24
  secrets:
    npm-token:
      description: 'NPM token for publishing packages'
      required: true
  ```

## Conditional Steps

- Use `if: ${{ inputs.use-lerna }}` (with expression syntax) for input-driven branches.
- Pair every Lerna step with a matching simple-repo step using `if: ${{ !inputs.use-lerna }}`.
- Keep paired steps adjacent so the branching intent is immediately visible.

## `run:` Scripts

- Prefer single-line `run:` for one-liner commands.
- Use `|` block scalar for multi-line scripts:

  ```yaml
  - run: |
      BUMP=$(npx conventional-recommended-bump -p angular)
      npm version $BUMP
  ```

- When downloading a remote script, prefer `curl -fsSL` (for example before piping into `bash`) so HTTP errors fail fast and successful downloads stay quiet.

- Write to `$GITHUB_OUTPUT` using the `>>` append operator, never `set-output`.

  ```yaml
  echo "key=value" >> "$GITHUB_OUTPUT"
  ```

## `env:` Blocks

- Place job-level `env:` only when the variable is needed by **all** steps in the job.
- Prefer step-level `env:` otherwise to minimise scope.
- Always set `HUSKY: 0` on any step that runs `npm version` or `npx lerna version` to prevent git hook interference.
