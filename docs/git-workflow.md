# Git Workflow

Branching strategy, commit conventions, and release triggers for this repository.

## Branching

- `main` is the only long-lived branch.
- Create short-lived feature branches off `main`: `feat/`, `fix/`, `chore/`, `docs/`.
- Open a PR to merge back into `main`.
- Delete branches after merge.

## Commit Messages

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is not a preference — the automated versioning in `reusable-npm-publish.yml` depends on it.

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

### Allowed Types

| Type       | When to use                                           |
| ---------- | ----------------------------------------------------- |
| `feat`     | A new workflow or new workflow input/output           |
| `fix`      | A bug fix in an existing workflow                     |
| `chore`    | Maintenance (dependency bumps, CODEOWNERS, CI config) |
| `docs`     | Documentation only changes                            |
| `refactor` | Restructuring with no behaviour change                |

### Breaking Changes

Append `!` after the type for breaking changes (e.g., removed input, changed default):

```
feat!: remove node-version input — callers must pin explicitly
```

Or add a `BREAKING CHANGE:` footer:

```
fix: correct lerna publish flags

BREAKING CHANGE: pre-release tag is now required; default removed
```

Breaking changes trigger a **major** version bump in callers' pinned refs.

### Examples

```
feat: add reusable-docker-build workflow
fix: pass fetch-depth 0 to checkout in pre-release job
chore: pin actions/checkout to v4
docs: document [publish] commit trigger
```

## The `[publish]` Pre-release Trigger

Adding `[publish]` anywhere in the **latest commit message** on a PR branch will cause `reusable-pr-checks.yml` to publish a pre-release to npm after CI passes.

```
fix: correct registry-url for scoped packages [publish]
```

Rules:

- `[publish]` is checked on the PR's `head.sha`, not the merge commit.
- The pre-release version uses the short Git SHA as the `preid` (e.g., `1.2.3-abc1234.0`).
- The dist-tag defaults to `rc`; override via the `pre-release-tag` input.
- Do **not** add `[publish]` to every commit — use it only when a pre-release is explicitly needed for testing.

## Tagging and Versioning

Tags are created automatically by the `reusable-npm-publish.yml` workflow on merge to `main`. Do **not** create version tags manually.

- Monorepo (Lerna): tags are created by `lerna version`.
- Simple repo: `npm version` creates the tag; a subsequent `git push --tags` publishes it.
