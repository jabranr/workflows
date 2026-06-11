# Wait for Cloudflare Pages Deployment

A custom reusable GitHub Action that can be used to block the workflow steps until the Cloudflare Pages deployment is complete.

## Usage

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

## Troubleshooting

### Error: Unhandled error: HttpError: Resource not accessible by integration

This error occurs when the `GITHUB_TOKEN` does not have the required permissions. Make sure that the workflow has the `checks: read` permission.
