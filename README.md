# Workflows [![Actionlint](https://github.com/jabranr/workflows/actions/workflows/actionlint.yml/badge.svg)](https://github.com/jabranr/workflows/actions/workflows/actionlint.yml)

Reusable GitHub Actions workflows for JavaScript/Node.js projects.

> Highly opinionated for my own personal use. Use at your own risk!

## Available Workflows

### `reusable-pr-checks.yml`

Runs CI checks on pull requests — tests, build, lint, format, and typecheck. Optionally publishes a pre-release to npm when the PR's latest commit message contains `[publish]`.

**Usage**

```yaml
jobs:
  pr-checks:
    uses: jabranr/workflows/.github/workflows/reusable-pr-checks.yml@main
    with:
      node-version: 24 # optional, default: 24
      use-lerna: true # optional, default: true
      pre-release-tag: rc # optional, default: rc
      run-pre-release: true # optional, default: true
      run-unit-test: true # optional, default: true
      run-build: true # optional, default: true
      run-lint: true # optional, default: true
      run-format-check: true # optional, default: true
      run-typecheck: true # optional, default: true
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }} # required when run-pre-release is true
```

**Inputs**

| Input              | Type    | Default | Description                                                                               |
| ------------------ | ------- | ------- | ----------------------------------------------------------------------------------------- |
| `node-version`     | number  | `24`    | Node.js version to use                                                                    |
| `use-lerna`        | boolean | `true`  | Use Lerna for pre-release publishing (set `false` for simple repos)                       |
| `pre-release-tag`  | string  | `rc`    | npm dist-tag used when publishing a pre-release                                           |
| `run-pre-release`  | boolean | `true`  | Run the `check-publish` and `pre-release` jobs (set `false` to skip pre-release entirely) |
| `run-unit-test`    | boolean | `true`  | Run `npm test`                                                                            |
| `run-build`        | boolean | `true`  | Run `npm run build`                                                                       |
| `run-lint`         | boolean | `true`  | Run `npm run lint`                                                                        |
| `run-format-check` | boolean | `true`  | Run `npm run format:check`                                                                |
| `run-typecheck`    | boolean | `true`  | Run `npm run typecheck`                                                                   |

**Secrets**

| Secret      | Required                       | Description                                                                                                  |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `npm-token` | When `run-pre-release` is true | NPM token for publishing pre-release packages. The `check-publish` job fails fast if it is missing or empty. |

**Jobs**

- **`test-and-build`** — runs `npm ci`, then `npm test`, `npm run build`, `npm run lint`, `npm run format:check`, and `npm run typecheck`. Each script step is gated by its matching `run-*` input and skipped when set to `false`.
- **`check-publish`** — runs only when `run-pre-release` is `true`. Validates that `npm-token` is set, then inspects the PR head commit message and sets `should_publish=true` if it contains `[publish]`.
- **`pre-release`** — publishes a pre-release version to npm. Runs only when `run-pre-release` is `true` **and** `check-publish` set `should_publish=true`.

---

### `reusable-npm-publish.yml`

Versions and publishes packages to npm. Intended to run on merges to the main branch.

**Usage**

```yaml
jobs:
  publish:
    uses: jabranr/workflows/.github/workflows/reusable-npm-publish.yml@main
    with:
      node-version: 24 # optional, default: 24
      use-lerna: true # optional, default: true
      run-unit-test: true # optional, default: true
      run-build: true # optional, default: true
      run-lint: true # optional, default: true
      run-format-check: true # optional, default: true
      run-typecheck: true # optional, default: true
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs**

| Input              | Type    | Default | Description                                                            |
| ------------------ | ------- | ------- | ---------------------------------------------------------------------- |
| `node-version`     | number  | `24`    | Node.js version to use                                                 |
| `use-lerna`        | boolean | `true`  | Use Lerna for versioning and publishing (set `false` for simple repos) |
| `run-unit-test`    | boolean | `true`  | Run `npm test`                                                         |
| `run-build`        | boolean | `true`  | Run `npm run build`                                                    |
| `run-lint`         | boolean | `true`  | Run `npm run lint`                                                     |
| `run-format-check` | boolean | `true`  | Run `npm run format:check`                                             |
| `run-typecheck`    | boolean | `true`  | Run `npm run typecheck`                                                |

**Secrets**

| Secret         | Required | Description                                       |
| -------------- | -------- | ------------------------------------------------- |
| `npm-token`    | Yes      | NPM token for publishing packages                 |
| `github-token` | Yes      | GitHub token for pushing version commits and tags |

**Steps**

1. Checks out the repo with full history (`fetch-depth: 0`) using `github-token`
2. Lints workflow files with the bundled `actionlint` composite action
3. Runs `npm ci`, then `npm test`, `npm run build`, `npm run lint`, `npm run format:check`, and `npm run typecheck` — each script step is gated by its matching `run-*` input and skipped when set to `false`
4. Configures the `github-actions[bot]` git identity (and marks the workspace as a safe directory)
5. **Monorepo (Lerna):** versions packages with conventional commits, then publishes via `lerna publish from-git`
6. **Simple repo:** bumps the version with `conventional-recommended-bump`, pushes the commit and tag, then publishes via `npm publish`

`HUSKY: 0` is set at the job level so it applies to every step that runs `npm version` or `npx lerna version`.

---

### `reusable-integration.yml`

Runs Playwright-based integration tests (`functional`, `e2e`, `smoke`, or `vr`) and uploads the Playwright report as a workflow artifact.

**Usage**

```yaml
jobs:
  integration:
    uses: jabranr/workflows/.github/workflows/reusable-integration.yml@main
    with:
      node-version: 24 # optional, default: 24
      test-type: e2e # optional, default: functional
      timeout-minutes: 60 # optional, default: 60
      reports-retention-days: 7 # optional, default: 7
```

**Inputs**

| Input                    | Type   | Default      | Description                                               |
| ------------------------ | ------ | ------------ | --------------------------------------------------------- |
| `node-version`           | number | `24`         | Node.js version to use                                    |
| `test-type`              | string | `functional` | Type of tests to run (`functional`, `e2e`, `smoke`, `vr`) |
| `timeout-minutes`        | number | `60`         | Job timeout in minutes                                    |
| `reports-retention-days` | number | `7`          | Number of days to retain the uploaded Playwright report   |

**Jobs**

- **`validate-inputs`** — fails fast if `test-type` is not one of `functional`, `e2e`, `smoke`, `vr`
- **`functional`** — runs when `test-type` is `functional` or `vr`; installs Playwright browsers and runs `npm run test:<test-type>` with `TEST_ENV=functional`
- **`integration`** — runs when `test-type` is `e2e` or `smoke`; installs Playwright browsers and runs `npm run test:<test-type>`

Both job variants upload a `playwright-report-<test-type>` artifact unless the workflow is cancelled.

## Composite Actions

Reusable composite actions live under `.github/actions/`. Reference them in a step's `uses:` field.

---

### `actions/actionlint`

Downloads the official [`actionlint`](https://github.com/rhysd/actionlint) installer with `curl -fsSL` and runs it against all workflow files in the repository. Place this step immediately after `actions/checkout`.

**Usage**

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: jabranr/workflows/.github/actions/actionlint@main
```

No inputs or secrets.

---

### `actions/wait-cf-pages-deployment`

Polls the GitHub Checks API until the **Cloudflare Pages** check run for the current ref (`context.payload.after || context.sha`) reaches a `completed` state. Retries every 15 seconds for up to 2 minutes, then throws if the check has not completed or if it fails.

Use this after triggering a Cloudflare Pages deployment to block subsequent steps (e.g. a Lighthouse audit) until the deployment is confirmed successful.

Internally, the action loads a bundled CommonJS helper (`wait-cf-pages-deployment.cjs`) via `actions/github-script`, which keeps it compatible with repositories that set `"type": "module"`.

**Usage**

```yaml
deployment-status:
  runs-on: ubuntu-latest
  permissions:
    checks: read
  steps:
    - name: Wait for Cloudflare Pages deployment
      uses: jabranr/workflows/.github/actions/wait-cf-pages-deployment@main
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs**

| Input          | Required | Description                                                                                  |
| -------------- | -------- | -------------------------------------------------------------------------------------------- |
| `github-token` | No       | GitHub token used to authenticate Checks API calls. Defaults to `github.token` when omitted. |

Requires the workflow to have `checks: read` permission (GitHub's default for `GITHUB_TOKEN`).

#### Troubleshooting

**Error: Unhandled error: HttpError: Resource not accessible by integration**

This error occurs when the `GITHUB_TOKEN` does not have the required permissions. Make sure that the workflow has the `checks: read` permission.

---

### `actions/performance-audit`

Runs a [Lighthouse](https://github.com/foo-software/lighthouse-check-action) performance audit against one or more URLs. On `pull_request` events the results are posted as a PR comment; on `push` events the HTML reports are uploaded as a `lighthouse-results` workflow artifact. Intended to run after a deployment (e.g. to Cloudflare Pages).

**Usage**

```yaml
steps:
  - uses: jabranr/workflows/.github/actions/performance-audit@main
    with:
      urls: 'https://jabran.dev,https://jabran.dev/resume/'
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs**

| Input          | Required | Description                                                     |
| -------------- | -------- | --------------------------------------------------------------- |
| `urls`         | Yes      | Comma-separated list of URLs to audit                           |
| `github-token` | Yes      | GitHub token used to post Lighthouse results as a commit status |

---

## License

[MIT](./LICENSE) © Jabran Rafique
