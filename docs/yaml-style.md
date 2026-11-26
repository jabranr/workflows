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

- Pin all `uses:` references to a **full 40-character commit SHA**, with the exact version (or branch, for this repo's own actions) as a trailing comment. A tag or branch can be moved to point at different code; a SHA cannot.

  ```yaml
  # ✅ correct
  - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
  - uses: jabranr/workflows/.github/actions/actionlint@ad3f06522e7b029504ab30aeb3fc958aab8b1bef # main

  # ❌ avoid
  - uses: actions/checkout@v4
  - uses: actions/checkout@main
  - uses: actions/checkout@abc1234def
  ```

- Resolve a tag to its SHA with `git ls-remote https://github.com/<owner>/<repo> 'refs/tags/<tag>^{}' 'refs/tags/<tag>'` (the `^{}` line is the commit for annotated tags).
- After adding, removing or bumping a pin, run `npm run ci:inventory:update` and commit the updated `secureci.lock`. The `secureci.yml` workflow runs `secureci inventory --check` and fails when a pin is missing from the lock or a locked ref has moved.

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

- Every input must have a `description:` and `type:`.
- Provide a `default:` whenever a sensible one exists. Omit `required:` on inputs with a `default:` — the default already makes them optional and `required: false` is redundant noise.
- Boolean feature toggles (e.g. `run-unit-test`, `run-pre-release`) must default to `true` so callers opt **out** rather than opt in. Name them `run-<thing>`.
- Every secret must have a `description:` and explicit `required: true` or `required: false`.

  ```yaml
  inputs:
    node-version:
      description: 'Node.js version to use'
      type: number
      default: 24
    run-unit-test:
      description: 'Run unit tests'
      type: boolean
      default: true
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

- Place job-level `env:` only when the variable is needed by **all** (or most) steps in the job.
- Prefer step-level `env:` otherwise to minimise scope.
- `HUSKY: 0` must cover every step that runs `npm version` or `npx lerna version`. Set it at the job level when multiple such steps exist (e.g. `reusable-npm-publish.yml`); set it at the step level when only one step needs it.
