// Cloudflare Pages branch alias rules: lowercased, runs of non-alphanumerics
// become '-', cut to 28 characters, edge '-' trimmed. The 28-character limit is
// not documented; it comes from real aliases such as
// "copilot/update-github-workflow-chrome" -> "copilot-update-github-workfl".
const ALIAS_MAX_LENGTH = 28;

function computeBranchAlias(branch) {
  return String(branch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, ALIAS_MAX_LENGTH)
    .replace(/^-+|-+$/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// When two branches cut to the same alias, Cloudflare adds a random suffix
// (e.g. "dependabot-npm-and-yarn-liqu-o3mj"), so the URL from the check run
// is preferred over the computed alias.
function findBranchPreviewUrl(checkRuns, pagesDomain) {
  const host = pagesDomain ? escapeRegExp(pagesDomain.toLowerCase()) : '[a-z0-9-]+\\.pages\\.dev';
  const pattern = new RegExp(`Branch Preview URL[\\s\\S]*?(https://[a-z0-9-]+\\.${host})`, 'i');

  for (const run of checkRuns) {
    const output = `${run.output?.summary ?? ''}\n${run.output?.text ?? ''}`;
    const match = output.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return '';
}

async function resolveCloudflarePagesPreviewUrl({ github, context, core, productionUrl, pagesDomain = '' }) {
  const pullRequest = context.payload.pull_request;

  if (!pullRequest) {
    const url = String(productionUrl).replace(/\/+$/, '');
    core.info(`Not a pull request; using production URL ${url}`);
    return url;
  }

  let url = '';
  try {
    const { data } = await github.rest.checks.listForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: pullRequest.head.sha,
      check_name: 'Cloudflare Pages',
    });
    url = findBranchPreviewUrl(data.check_runs ?? [], pagesDomain);
  } catch (error) {
    core.warning(`Could not read Cloudflare Pages check run: ${error.message}`);
  }

  if (url) {
    core.info(`Using Branch Preview URL from Cloudflare Pages check run: ${url}`);
    return url;
  }

  if (!pagesDomain) {
    throw new Error(
      'Branch Preview URL not found in Cloudflare Pages check run, and no pages-domain set to compute it'
    );
  }

  url = `https://${computeBranchAlias(pullRequest.head.ref)}.${pagesDomain.toLowerCase()}`;
  core.warning(`Branch Preview URL not found in Cloudflare Pages check run; using computed alias ${url}`);
  return url;
}

module.exports = resolveCloudflarePagesPreviewUrl;
module.exports.computeBranchAlias = computeBranchAlias;
module.exports.findBranchPreviewUrl = findBranchPreviewUrl;
