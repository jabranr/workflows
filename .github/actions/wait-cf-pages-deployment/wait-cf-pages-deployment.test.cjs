const test = require('node:test');
const assert = require('node:assert/strict');
const waitForCloudflarePagesDeployment = require('./wait-cf-pages-deployment.cjs');

function makeGithub({ totalCount = 0, status, conclusion } = {}) {
  const calls = [];
  const github = {
    rest: {
      checks: {
        listForRef: async (params) => {
          calls.push(params);
          if (!totalCount) {
            return { data: { total_count: 0, check_runs: [] } };
          }
          return {
            data: {
              total_count: totalCount,
              check_runs: [{ status, conclusion }],
            },
          };
        },
      },
    },
  };
  return { github, calls };
}

const baseContext = {
  repo: { owner: 'jabranr', repo: 'family-tree' },
  sha: 'merge-sha',
  payload: {},
};

test('uses pull_request.head.sha on pull_request events', async () => {
  const { github, calls } = makeGithub({
    totalCount: 1,
    status: 'completed',
    conclusion: 'success',
  });

  await waitForCloudflarePagesDeployment({
    github,
    context: {
      ...baseContext,
      payload: {
        pull_request: { head: { sha: 'pr-head-sha' } },
        after: 'push-after-sha',
      },
    },
    log: () => {},
    sleep: async () => {},
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].ref, 'pr-head-sha');
});

test('falls back to payload.after on push events', async () => {
  const { github, calls } = makeGithub({
    totalCount: 1,
    status: 'completed',
    conclusion: 'success',
  });

  await waitForCloudflarePagesDeployment({
    github,
    context: { ...baseContext, payload: { after: 'push-after-sha' } },
    log: () => {},
    sleep: async () => {},
  });

  assert.equal(calls[0].ref, 'push-after-sha');
});

test('falls back to context.sha when neither pull_request nor after is present', async () => {
  const { github, calls } = makeGithub({
    totalCount: 1,
    status: 'completed',
    conclusion: 'success',
  });

  await waitForCloudflarePagesDeployment({
    github,
    context: { ...baseContext, payload: {} },
    log: () => {},
    sleep: async () => {},
  });

  assert.equal(calls[0].ref, 'merge-sha');
});

test('emits a core.warning when no check is ever found', async () => {
  const { github } = makeGithub({ totalCount: 0 });
  const warnings = [];
  const core = { warning: (msg) => warnings.push(msg) };

  await waitForCloudflarePagesDeployment({
    github,
    context: { ...baseContext, payload: {} },
    core,
    log: () => {},
    maxAttempts: 2,
    intervalSeconds: 0,
    sleep: async () => {},
  });

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /No Cloudflare Pages deployment check found/);
  assert.match(warnings[0], /merge-sha/);
});

test('throws when the deployment completes with a non-success conclusion', async () => {
  const { github } = makeGithub({
    totalCount: 1,
    status: 'completed',
    conclusion: 'failure',
  });

  await assert.rejects(
    waitForCloudflarePagesDeployment({
      github,
      context: { ...baseContext, payload: {} },
      log: () => {},
      sleep: async () => {},
    }),
    /Cloudflare Pages deployment failed with conclusion: failure/
  );
});
