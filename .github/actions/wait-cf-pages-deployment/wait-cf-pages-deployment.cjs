async function waitForCloudflarePagesDeployment({
  github,
  context,
  core,
  log = console.log,
  maxAttempts = 9, // 2 minutes with 15 second intervals
  intervalSeconds = 15,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const ref = context.payload.pull_request?.head?.sha || context.payload.after || context.sha;

  let checkEverFound = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log(`Attempt ${attempt}/${maxAttempts}: Checking for Cloudflare Pages deployment...`);

    const { data: cfDeployCheck } = await github.rest.checks.listForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref,
      check_name: 'Cloudflare Pages',
    });

    if (!cfDeployCheck.total_count) {
      if (attempt < maxAttempts) {
        log(`Retrying in ${intervalSeconds} seconds to check status for Cloudflare deployment...`);
        await sleep(intervalSeconds * 1000);
      } else if (checkEverFound) {
        throw new Error('Timeout: Cloudflare Pages deployment did not complete in time');
      }

      continue;
    }

    checkEverFound = true;
    const [cfCheck] = cfDeployCheck.check_runs;

    if (cfCheck.status === 'queued') {
      log('Cloudflare Pages deployment is queued. Waiting...');
      await sleep(intervalSeconds * 1000);
    } else if (cfCheck.status === 'in_progress') {
      log(`Cloudflare Pages deployment is ${attempt < 2 ? '' : 'still '}in progress. Waiting...`);
      await sleep(intervalSeconds * 1000);
    } else if (cfCheck.status === 'completed') {
      log('Cloudflare Pages status updated...');

      if (cfCheck.conclusion === 'success') {
        log('✓ Cloudflare Pages deployment successful!');
        return;
      }

      throw new Error(`Cloudflare Pages deployment failed with conclusion: ${cfCheck.conclusion}`);
    }
  }

  if (!checkEverFound) {
    const message = `No Cloudflare Pages deployment check found for ref ${ref} after ${maxAttempts} attempts.`;
    if (core && typeof core.warning === 'function') {
      core.warning(message);
    } else {
      log(message);
    }
  }
}

module.exports = waitForCloudflarePagesDeployment;
