# workflows

Reusable GitHub Actions workflows for JavaScript/Node.js projects.

## Available Workflows

### `reusable-pr-checks.yml`

Runs CI checks on pull requests — tests, build, lint, format, and typecheck. Optionally publishes a pre-release to npm when the PR's latest commit message contains `[publish]`.

**Usage**

```yaml
jobs:
  pr-checks:
    uses: jabranr/workflows/.github/workflows/reusable-pr-checks.yml@main
    with:
      node-version: 24       # optional, default: 24
      use-lerna: true        # optional, default: true
      pre-release-tag: rc    # optional, default: rc
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}   # optional, only needed for pre-release publishing
```

**Inputs**

| Input | Type | Default | Description |
|---|---|---|---|
| `node-version` | number | `24` | Node.js version to use |
| `use-lerna` | boolean | `true` | Use Lerna for pre-release publishing (set `false` for simple repos) |
| `pre-release-tag` | string | `rc` | npm dist-tag used when publishing a pre-release |

**Secrets**

| Secret | Required | Description |
|---|---|---|
| `npm-token` | No | NPM token for publishing pre-release packages |

**Jobs**

- **`test-and-build`** — runs `npm ci`, `npm test`, `npm run build`, `npm run lint`, `npm run format`, `npm run typecheck`
- **`check-publish`** — inspects the latest commit message; sets `should_publish=true` if it contains `[publish]`
- **`pre-release`** — publishes a pre-release version to npm (runs only when `should_publish=true`)

---

### `reusable-npm-publish.yml`

Versions and publishes packages to npm. Intended to run on merges to the main branch.

**Usage**

```yaml
jobs:
  publish:
    uses: jabranr/workflows/.github/workflows/reusable-npm-publish.yml@main
    with:
      node-version: 24    # optional, default: 24
      use-lerna: true     # optional, default: true
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs**

| Input | Type | Default | Description |
|---|---|---|---|
| `node-version` | number | `24` | Node.js version to use |
| `use-lerna` | boolean | `true` | Use Lerna for versioning and publishing (set `false` for simple repos) |

**Secrets**

| Secret | Required | Description |
|---|---|---|
| `npm-token` | Yes | NPM token for publishing packages |
| `github-token` | Yes | GitHub token for pushing version commits and tags |

**Steps**

1. Checks out the repo with full history (`fetch-depth: 0`)
2. Runs `npm ci`, `npm test`, `npm run build`, `npm run lint`, `npm run format`, `npm run typecheck`
3. **Monorepo (Lerna):** versions packages with conventional commits, then publishes via `lerna publish from-git`
4. **Simple repo:** bumps the version with `conventional-recommended-bump`, pushes the commit and tag, then publishes via `npm publish`

---

### `reusable-lighthouse.yml`

Runs a [Lighthouse](https://github.com/foo-software/lighthouse-check-action) performance audit against one or more URLs and uploads the HTML reports as a workflow artifact. Intended to run after a deployment (e.g. to Cloudflare Pages).

**Usage**

```yaml
jobs:
  lighthouse:
    uses: jabranr/workflows/.github/workflows/reusable-lighthouse.yml@main
    with:
      urls: 'https://my-app.pages.dev,https://my-app.pages.dev/login'
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs**

| Input | Type | Default | Description |
|---|---|---|---|
| `urls` | string | — | Comma-separated list of URLs to audit |

**Secrets**

| Secret | Required | Description |
|---|---|---|
| `github-token` | Yes | GitHub token used to post Lighthouse results as a commit status |

**Steps**

1. Waits `wait-seconds` seconds for the deployment to propagate
2. Checks out the repository
3. Runs Lighthouse against each URL in `urls`
4. Uploads HTML reports to a `lighthouse-results` workflow artifact

## License

[MIT](./LICENSE) © Jabran Rafique

