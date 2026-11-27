const test = require('node:test');
const assert = require('node:assert/strict');
const resolveCloudflarePagesPreviewUrl = require('./cf-pages-preview-url.cjs');
const { computeBranchAlias, findBranchPreviewUrl } = resolveCloudflarePagesPreviewUrl;

// Mirrors the Cloudflare Pages bot's deployment table.
function cfSummary(branchUrl) {
  return [
    '<table><tr><td><strong>Preview URL:</strong></td><td>',
    "<a href='https://78218d51.jabranr.pages.dev'>https://78218d51.jabranr.pages.dev</a>",
    '</td></tr><tr><td><strong>Branch Preview URL:</strong></td><td>',
    `<a href='${branchUrl}'>${branchUrl}</a>`,
    '</td></tr></table>',
  ].join('\n');
}

function makeGithub({ checkRuns = [], error } = {}) {
  const calls = [];
  const github = {
    rest: {
      checks: {
        listForRef: async (params) => {
          calls.push(params);
          if (error) throw error;
          return { data: { total_count: checkRuns.length, check_runs: checkRuns } };
        },
      },
    },
  };
  return { github, calls };
}

function makeCore() {
  const warnings = [];
  return { warnings, core: { info: () => {}, warning: (msg) => warnings.push(msg) } };
}

const prContext = (ref) => ({
  repo: { owner: 'jabranr', repo: 'jabranr.github.io' },
  payload: { pull_request: { head: { sha: 'pr-head-sha', ref } } },
});

test('computeBranchAlias matches real Cloudflare Pages aliases', () => {
  assert.equal(computeBranchAlias('claude/secureci-cli-setup-inventory-gdmnwy'), 'claude-secureci-cli-setup-in');
  assert.equal(computeBranchAlias('copilot/update-github-workflow-chrome'), 'copilot-update-github-workfl');
  assert.equal(computeBranchAlias('dependabot/npm_and_yarn/liquidjs-10.27.0'), 'dependabot-npm-and-yarn-liqu');
  assert.equal(computeBranchAlias('fix/api'), 'fix-api');
  assert.equal(computeBranchAlias('Fix-Layout'), 'fix-layout');
});

test('computeBranchAlias trims edge dashes, including one left by truncation', () => {
  assert.equal(computeBranchAlias('/feature/'), 'feature');
  assert.equal(computeBranchAlias('abcdefghijklmnopqrstuvwxyza/-x'), 'abcdefghijklmnopqrstuvwxyza');
});

test('findBranchPreviewUrl picks the branch URL, not the per-deployment URL', () => {
  const runs = [{ output: { summary: cfSummary('https://claude-secureci-cli-setup-in.jabranr.pages.dev') } }];
  assert.equal(
    findBranchPreviewUrl(runs, 'jabranr.pages.dev'),
    'https://claude-secureci-cli-setup-in.jabranr.pages.dev'
  );
  assert.equal(findBranchPreviewUrl(runs, ''), 'https://claude-secureci-cli-setup-in.jabranr.pages.dev');
});

test('findBranchPreviewUrl ignores URLs on another pages-domain', () => {
  const runs = [{ output: { summary: cfSummary('https://foo.other.pages.dev') } }];
  assert.equal(findBranchPreviewUrl(runs, 'jabranr.pages.dev'), '');
});

test('returns production URL without a trailing slash outside pull requests', async () => {
  const { github, calls } = makeGithub();
  const { core } = makeCore();
  const url = await resolveCloudflarePagesPreviewUrl({
    github,
    context: { repo: {}, payload: {} },
    core,
    productionUrl: 'https://jabran.me/',
  });
  assert.equal(url, 'https://jabran.me');
  assert.equal(calls.length, 0);
});

test('uses the check run Branch Preview URL, including a collision suffix', async () => {
  const { github, calls } = makeGithub({
    checkRuns: [{ output: { summary: cfSummary('https://dependabot-npm-and-yarn-liqu-o3mj.jabranr.pages.dev') } }],
  });
  const { core, warnings } = makeCore();
  const url = await resolveCloudflarePagesPreviewUrl({
    github,
    context: prContext('dependabot/npm_and_yarn/liquidjs-10.27.0'),
    core,
    productionUrl: 'https://jabran.me',
    pagesDomain: 'jabranr.pages.dev',
  });
  assert.equal(url, 'https://dependabot-npm-and-yarn-liqu-o3mj.jabranr.pages.dev');
  assert.equal(calls[0].ref, 'pr-head-sha');
  assert.equal(calls[0].check_name, 'Cloudflare Pages');
  assert.equal(warnings.length, 0);
});

test('falls back to the computed alias with a warning when the check run has no URL', async () => {
  const { github } = makeGithub({ checkRuns: [{ output: { summary: 'Deploying...' } }] });
  const { core, warnings } = makeCore();
  const url = await resolveCloudflarePagesPreviewUrl({
    github,
    context: prContext('claude/secureci-cli-setup-inventory-gdmnwy'),
    core,
    productionUrl: 'https://jabran.me',
    pagesDomain: 'jabranr.pages.dev',
  });
  assert.equal(url, 'https://claude-secureci-cli-setup-in.jabranr.pages.dev');
  assert.match(warnings[0], /computed alias/);
});

test('falls back to the computed alias when the Checks API call fails', async () => {
  const { github } = makeGithub({ error: new Error('Resource not accessible by integration') });
  const { core, warnings } = makeCore();
  const url = await resolveCloudflarePagesPreviewUrl({
    github,
    context: prContext('fix/api'),
    core,
    productionUrl: 'https://jabran.me',
    pagesDomain: 'jabranr.pages.dev',
  });
  assert.equal(url, 'https://fix-api.jabranr.pages.dev');
  assert.match(warnings[0], /Resource not accessible/);
});

test('throws when no URL is found and pages-domain is not set', async () => {
  const { github } = makeGithub();
  const { core } = makeCore();
  await assert.rejects(
    resolveCloudflarePagesPreviewUrl({
      github,
      context: prContext('fix/api'),
      core,
      productionUrl: 'https://jabran.me',
    }),
    /no pages-domain set/
  );
});
