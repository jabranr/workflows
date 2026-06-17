const test = require('node:test');
const assert = require('node:assert/strict');
const waitForCloudflarePagesDeployment = require('./wait-cf-pages-deployment.cjs');

function makeGithub({ totalCount = 0, status, conclusion, responses } = {}) {
  const calls = [];
  let index = 0;
  const github = {
    rest: {
      checks: {
        listForRef: async (params) => {
          calls.push(params);
          if (responses) {
            const next = responses[Math.min(index, responses.length - 1)];
            index += 1;
            return { data: next };
          }
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

test('emits a core.warning and polls maxAttempts times when no check is ever found', async () => {
  const { github, calls } = makeGithub({ totalCount: 0 });
  const warnings = [];
  const core = { warning: (msg) => warnings.push(msg) };

  await waitForCloudflarePagesDeployment({
    github,
    context: { ...baseContext, payload: {} },
    core,
    log: () => {},
    maxAttempts: 3,
    intervalSeconds: 0,
    sleep: async () => {},
  });

  assert.equal(calls.length, 3);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /No Cloudflare Pages deployment check found/);
  assert.match(warnings[0], /merge-sha/);
  assert.match(warnings[0], /after 3 attempts/);
});

test('falls back to log when no check is found and core is not provided', async () => {
  const { github } = makeGithub({ totalCount: 0 });
  const logs = [];

  await waitForCloudflarePagesDeployment({
    github,
    context: { ...baseContext, payload: {} },
    log: (msg) => logs.push(msg),
    maxAttempts: 2,
    intervalSeconds: 0,
    sleep: async () => {},
  });

  assert.ok(
    logs.some((m) => /No Cloudflare Pages deployment check found/.test(m)),
    'expected fallback log when core is omitted'
  );
});

test('passes intervalSeconds * 1000 to sleep', async () => {
  const { github } = makeGithub({ totalCount: 0 });
  const sleepCalls = [];

  await waitForCloudflarePagesDeployment({
    github,
    context: { ...baseContext, payload: {} },
    log: () => {},
    maxAttempts: 2,
    intervalSeconds: 5,
    sleep: async (ms) => {
      sleepCalls.push(ms);
    },
  });

  assert.equal(sleepCalls.length, 1);
  assert.equal(sleepCalls[0], 5000);
});

test('returns successfully after queued → in_progress → completed/success', async () => {
  const { github, calls } = makeGithub({
    responses: [
      { total_count: 1, check_runs: [{ status: 'queued' }] },
      { total_count: 1, check_runs: [{ status: 'in_progress' }] },
      { total_count: 1, check_runs: [{ status: 'completed', conclusion: 'success' }] },
    ],
  });

  await waitForCloudflarePagesDeployment({
    github,
    context: { ...baseContext, payload: {} },
    log: () => {},
    intervalSeconds: 0,
    sleep: async () => {},
  });

  assert.equal(calls.length, 3);
});

test('throws timeout when the check is found but disappears on the final attempt', async () => {
  const { github } = makeGithub({
    responses: [
      { total_count: 1, check_runs: [{ status: 'in_progress' }] },
      { total_count: 0, check_runs: [] },
    ],
  });

  await assert.rejects(
    waitForCloudflarePagesDeployment({
      github,
      context: { ...baseContext, payload: {} },
      log: () => {},
      maxAttempts: 2,
      intervalSeconds: 0,
      sleep: async () => {},
    }),
    /Timeout: Cloudflare Pages deployment did not complete in time/
  );
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
