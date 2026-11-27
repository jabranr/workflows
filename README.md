# Workflows [![SecureCI](https://github.com/jabranr/workflows/actions/workflows/secureci.yml/badge.svg)](https://github.com/jabranr/workflows/actions/workflows/secureci.yml)

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
      runner: ubuntu-24.04 # optional, default: ubuntu-24.04
      use-lerna: true # optional, default: true
      pre-release-tag: rc # optional, default: rc
      run-pre-release: true # optional, default: true
      run-unit-test: true # optional, default: true
      run-build: true # optional, default: true
      run-lint: true # optional, default: true
      run-format-check: true # optional, default: true
      run-typecheck: true # optional, default: true
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }} # optional; omit to use npm trusted publishing (OIDC)
```

**Inputs**

| Input              | Type    | Default        | Description                                                                                                       |
| ------------------ | ------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `node-version`     | number  | `24`           | Node.js version to use                                                                                            |
| `runner`           | string  | `ubuntu-24.04` | Runner label for all three jobs (e.g. `ubuntu-24.04`, `ubuntu-latest`). See [Runner selection](#runner-selection) |
| `use-lerna`        | boolean | `true`         | Use Lerna for pre-release publishing (set `false` for simple repos)                                               |
| `pre-release-tag`  | string  | `rc`           | npm dist-tag used when publishing a pre-release                                                                   |
| `run-pre-release`  | boolean | `true`         | Run the `check-publish` and `pre-release` jobs (set `false` to skip pre-release entirely)                         |
| `run-unit-test`    | boolean | `true`         | Run `npm test`                                                                                                    |
| `run-build`        | boolean | `true`         | Run `npm run build`                                                                                               |
| `run-lint`         | boolean | `true`         | Run `npm run lint`                                                                                                |
| `run-format-check` | boolean | `true`         | Run `npm run format:check`                                                                                        |
| `run-typecheck`    | boolean | `true`         | Run `npm run typecheck`                                                                                           |

**Secrets**

| Secret      | Required | Description                                                                                                                    |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm-token` | No       | NPM token for publishing pre-release packages. Omit it to publish with [npm trusted publishing](#npm-trusted-publishing-oidc). |

**Jobs**

- **`test-and-build`** — runs `npm ci`, then `npm test`, `npm run build`, `npm run lint`, `npm run format:check`, and `npm run typecheck`. Each script step is gated by its matching `run-*` input and skipped when set to `false`.
- **`check-publish`** — runs only when `run-pre-release` is `true`. Inspects the PR head commit message and sets `should_publish=true` if it contains `[publish]`.
- **`pre-release`** — publishes a pre-release version to npm. Requests `id-token: write`, so the caller must grant it (see [npm trusted publishing](#npm-trusted-publishing-oidc)). Runs only when `run-pre-release` is `true` **and** `check-publish` set `should_publish=true`.

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
      runner: ubuntu-24.04 # optional, default: ubuntu-24.04
      use-lerna: true # optional, default: true
      run-unit-test: true # optional, default: true
      run-build: true # optional, default: true
      run-lint: true # optional, default: true
      run-format-check: true # optional, default: true
      run-typecheck: true # optional, default: true
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }} # optional; omit to use npm trusted publishing (OIDC)
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs**

| Input              | Type    | Default        | Description                                                                                                |
| ------------------ | ------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `node-version`     | number  | `24`           | Node.js version to use                                                                                     |
| `runner`           | string  | `ubuntu-24.04` | Runner label for the job (e.g. `ubuntu-24.04`, `ubuntu-latest`). See [Runner selection](#runner-selection) |
| `use-lerna`        | boolean | `true`         | Use Lerna for versioning and publishing (set `false` for simple repos)                                     |
| `run-unit-test`    | boolean | `true`         | Run `npm test`                                                                                             |
| `run-build`        | boolean | `true`         | Run `npm run build`                                                                                        |
| `run-lint`         | boolean | `true`         | Run `npm run lint`                                                                                         |
| `run-format-check` | boolean | `true`         | Run `npm run format:check`                                                                                 |
| `run-typecheck`    | boolean | `true`         | Run `npm run typecheck`                                                                                    |

**Secrets**

| Secret         | Required | Description                                                                                                        |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm-token`    | No       | NPM token for publishing packages. Omit it to publish with [npm trusted publishing](#npm-trusted-publishing-oidc). |
| `github-token` | Yes      | GitHub token for pushing version commits and tags                                                                  |

**Steps**

1. Checks out the repo with full history (`fetch-depth: 0`) using `github-token`
2. Lints workflow files with the bundled `actionlint` composite action
3. Runs `npm ci`, then `npm test`, `npm run build`, `npm run lint`, `npm run format:check`, and `npm run typecheck` — each script step is gated by its matching `run-*` input and skipped when set to `false`
4. Configures the `github-actions[bot]` git identity (and marks the workspace as a safe directory)
5. **Monorepo (Lerna):** versions packages with conventional commits, then publishes via `lerna publish from-git`
6. **Simple repo:** bumps the version with `conventional-recommended-bump`, pushes the commit and tag, then publishes via `npm publish`

`HUSKY: 0` is set at the job level so it applies to every step that runs `npm version` or `npx lerna version`.

The workflow declares `contents: write` and `id-token: write`, so the caller must grant both.

---

### npm trusted publishing (OIDC)

`reusable-npm-publish.yml` and the `pre-release` job of `reusable-pr-checks.yml` publish with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) when no `npm-token` is passed. npm also adds provenance attestations automatically.

1. On npmjs.com, add a trusted publisher for the package with your repository and the **caller** workflow's filename (e.g. `npm-publish.yml`), not the reusable workflow's. npm checks the workflow that was triggered. Add one trusted publisher per caller file (up to 10), e.g. one for main-branch publishing and one for PR pre-releases. Allow `npm publish`, not only `npm stage publish`.
2. Grant `id-token: write` in the caller:

   ```yaml
   permissions:
     contents: write # contents: read for reusable-pr-checks.yml
     id-token: write
   ```

3. Make `repository.url` in `package.json` match the GitHub repository exactly (e.g. `git+https://github.com/<owner>/<repo>.git`).
4. Use Node.js 24 (the default). Trusted publishing needs npm 11.5.1 or later; without `npm-token`, the job fails early on an older npm.
5. Stop passing `npm-token`. If a token is passed, npm still prefers OIDC when it is available.

Pre-releases from pull requests opened from forks cannot publish this way, because GitHub gives fork PRs no OIDC token.

---

### `reusable-integration.yml`

Runs Playwright-based integration tests (`functional`, `e2e`, `smoke`, or `vr`) and uploads the Playwright report as a workflow artifact.

**Usage**

```yaml
jobs:
  integration:
    uses: jabranr/workflows/.github/workflows/reusable-integration.yml@main
    with:
      node-version: '24.15.0' # optional, default: '24.15.0'
      runner: ubuntu-24.04 # optional, default: ubuntu-24.04
      test-type: e2e # optional, default: functional
      container-image: '' # optional, default: '' (no container)
      run-node-setup: true # optional, default: true
      run-playwright-setup: true # optional, default: true
      timeout-minutes: 60 # optional, default: 60
      reports-retention-days: 7 # optional, default: 7
```

**Inputs**

| Input                    | Type    | Default        | Description                                                                                                |
| ------------------------ | ------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `node-version`           | string  | `'24.15.0'`    | Node.js version to use (ignored when `run-node-setup` is `false`). Pinned for [microsoft/playwright#40998] |
| `runner`                 | string  | `ubuntu-24.04` | Runner label for the job (e.g. `ubuntu-24.04`, `ubuntu-latest`). See [Runner selection](#runner-selection) |
| `test-type`              | string  | `functional`   | Type of tests to run (`functional`, `e2e`, `smoke`, `vr`)                                                  |
| `container-image`        | string  | `''`           | Optional container image to run the job in (must include `git`)                                            |
| `run-node-setup`         | boolean | `true`         | Run `actions/setup-node`. Set `false` when the container image already provides Node + npm                 |
| `run-playwright-setup`   | boolean | `true`         | Detect Playwright version, cache, and install browsers. Set `false` for Playwright images                  |
| `timeout-minutes`        | number  | `60`           | Job timeout in minutes                                                                                     |
| `reports-retention-days` | number  | `7`            | Number of days to retain the uploaded Playwright report                                                    |

[microsoft/playwright#40998]: https://github.com/microsoft/playwright/issues/40998

Typical container combinations:

- **Bare runner** (default): leave `container-image` empty; both `run-*` toggles stay `true`.
- **Node-only image** (e.g. `node:24-bookworm`): set `container-image` and `run-node-setup: false`.
- **Playwright image** (e.g. `mcr.microsoft.com/playwright:v1.55.0-noble`): set `container-image`, `run-node-setup: false`, and `run-playwright-setup: false`.

With `container-image` set, the browsers and system dependencies come from the image's OS, not the runner's, so `runner` only picks the host.

**Jobs**

- **`integration`** — single job named after `test-type`, optionally running inside `container-image`. Step order:
  1. **Validate test-type input** — fails fast if `test-type` is not one of `functional`, `e2e`, `smoke`, `vr`.
  2. **`actions/checkout`**.
  3. **Setup Node.js** — runs `actions/setup-node@v4` with the npm cache. Skipped when `run-node-setup` is `false`.
  4. **Install dependencies** — `npm ci`.
  5. **Get Playwright version**, **Cache Playwright browsers**, **Install Playwright browsers** — detect the installed `@playwright/test` version and the OS release (from `/etc/os-release`, e.g. `ubuntu24.04`), restore `~/.cache/ms-playwright` keyed on `playwright-<runner.os>-<runner.arch>-<os-release>-<version>` (e.g. `playwright-Linux-X64-ubuntu24.04-1.65.1`), then run `npx playwright install --with-deps chromium` on a cache miss, or `npx playwright install-deps` on a cache hit. All three are skipped when `run-playwright-setup` is `false`. If Playwright has no build for the OS, the step adds an error (or, for missing system dependencies, a warning) annotation explaining how to fix it. See [Runner selection](#runner-selection).
  6. **Run `<test-type>` tests** — `npm run test:<test-type>` with `CI=true`.
  7. **Save test reports** — uploads the `playwright-report-<test-type>/` directory as a `playwright-report-<test-type>` artifact unless the workflow is cancelled.

---

### Runner selection

Every job in the reusable workflows runs on `${{ inputs.runner }}`, which defaults to **`ubuntu-24.04`**. Pass any runner label to override it:

```yaml
jobs:
  functional-tests:
    uses: jabranr/workflows/.github/workflows/reusable-integration.yml@main
    with:
      test-type: functional
      runner: ubuntu-latest # opt in to the newest GitHub-hosted image
```

**Why the default is pinned.** The jobs used to run on `ubuntu-latest`, which by 2026-11-23 resolved to Ubuntu 26.04. Playwright only ships Ubuntu 26.04 browser builds from **1.61.0**, so any consumer on an older `@playwright/test` (e.g. 1.59.1) failed in **Install Playwright browsers** before a single test ran:

```text
BEWARE: your OS is not officially supported by Playwright; installing dependencies for ubuntu26.04-x64 as a fallback.
Cannot install dependencies for ubuntu26.04-x64 with Playwright 1.59.1!
Error: ERROR: Playwright does not support chromium on ubuntu26.04-x64
```

Pinning `ubuntu-24.04` keeps those consumers working. To move to a newer image, upgrade `@playwright/test` to a version that supports it (1.61.0 or newer for Ubuntu 26.04), then pass `runner: ubuntu-latest`.

If you see `if [ "$CACHE_HIT" = 'true' ]` with an empty `CACHE_HIT` in the step log, that is expected: `actions/cache` leaves `cache-hit` unset on a full cache miss, so the step falls through to a full browser install.

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

Polls the GitHub Checks API until the **Cloudflare Pages** check run for the current ref reaches a `completed` state. The ref is resolved as `context.payload.pull_request?.head?.sha || context.payload.after || context.sha`, which targets the PR head commit on `pull_request` / `pull_request_target` events (Cloudflare Pages posts its check against the head, not the synthetic merge commit), the pushed commit on `push` events, and falls back to `context.sha` otherwise. By default, retries every 15 seconds for up to 9 attempts (2 minutes), then throws if the check has not completed or if it fails. Both the polling interval and the number of attempts are configurable via the `interval-seconds` and `max-attempts` inputs. If no Cloudflare Pages check is ever found, the action emits a `core.warning` and exits successfully.

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
        github-token: ${{ secrets.GITHUB_TOKEN }} # optional
        max-attempts: 9 # optional, default: 9
        interval-seconds: 15 # optional, default: 15
```

**Inputs**

| Input              | Required | Default | Description                                                                                  |
| ------------------ | -------- | ------- | -------------------------------------------------------------------------------------------- |
| `github-token`     | No       | —       | GitHub token used to authenticate Checks API calls. Defaults to `github.token` when omitted. |
| `max-attempts`     | No       | `9`     | Maximum number of times to poll the Checks API before giving up.                             |
| `interval-seconds` | No       | `15`    | Number of seconds to wait between Checks API polls.                                          |

Requires the workflow to have `checks: read` permission (GitHub's default for `GITHUB_TOKEN`).

#### Troubleshooting

**Error: Unhandled error: HttpError: Resource not accessible by integration**

This error occurs when the `GITHUB_TOKEN` does not have the required permissions. Make sure that the workflow has the `checks: read` permission.

---

### `actions/cf-pages-preview-url`

Resolves the URL to test against after a Cloudflare Pages deployment. On `pull_request` / `pull_request_target` events it returns the **Branch Preview URL** from the `Cloudflare Pages` check run for the PR head commit. On any other event it returns `production-url`.

If the check run has no Branch Preview URL (or the Checks API call fails), it computes the alias the way Cloudflare does: lowercased, runs of non-alphanumerics become `-`, cut to 28 characters, and leading or trailing `-` trimmed (`claude/secureci-cli-setup-inventory-gdmnwy` → `claude-secureci-cli-setup-in`). It logs a warning when it falls back. The fallback needs `pages-domain`; without it, the action fails instead of guessing. The check run comes first because Cloudflare adds a random suffix when two branches cut to the same alias (e.g. `dependabot-npm-and-yarn-liqu-o3mj`).

Run it after `wait-cf-pages-deployment` so the check run has completed. Like that action, it loads a bundled CommonJS helper (`cf-pages-preview-url.cjs`) via `actions/github-script`.

**Usage**

```yaml
performance-audit:
  needs: deployment-status
  runs-on: ubuntu-latest
  permissions:
    checks: read
  steps:
    - name: Get domain
      id: get-domain
      uses: jabranr/workflows/.github/actions/cf-pages-preview-url@main
      with:
        production-url: 'https://jabran.me'
        pages-domain: 'jabranr.pages.dev' # optional, enables the computed fallback

    - uses: jabranr/workflows/.github/actions/performance-audit@main
      with:
        urls: '${{ steps.get-domain.outputs.url }},${{ steps.get-domain.outputs.url }}/resume/'
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs**

| Input            | Required | Default | Description                                                                                                                       |
| ---------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `production-url` | Yes      | —       | URL returned outside pull requests. A trailing `/` is removed.                                                                    |
| `pages-domain`   | No       | `''`    | The project's `pages.dev` domain (e.g. `jabranr.pages.dev`). Narrows the check run match and enables the computed-alias fallback. |
| `github-token`   | No       | —       | Token for Checks API calls. Defaults to `github.token`.                                                                           |

**Outputs**

| Output | Description                                 |
| ------ | ------------------------------------------- |
| `url`  | The resolved URL, without a trailing slash. |

Requires `checks: read` on pull requests.

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
