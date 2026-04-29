async function waitForCloudflarePagesDeployment({ github, context, log = console.log }) {
  const maxAttempts = 9; // 2 minutes with 15 second intervals
  const intervalSeconds = 15;
  let checkEverFound = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log(`Attempt ${attempt}/${maxAttempts}: Checking for Cloudflare Pages deployment...`);

    const { data: cfDeployCheck } = await github.rest.checks.listForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: context.payload.after || context.sha,
      check_name: 'Cloudflare Pages',
    });

    if (!cfDeployCheck.total_count) {
      if (attempt < maxAttempts) {
        log(`Retrying in ${intervalSeconds} seconds to check status for Cloudflare deployment...`);
        await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
      } else if (checkEverFound) {
        throw new Error('Timeout: Cloudflare Pages deployment did not complete in time');
      } else {
        log('No Cloudflare Pages deployment check found. Skipping...');
      }

      continue;
    }

    checkEverFound = true;
    const [cfCheck] = cfDeployCheck.check_runs;

    if (cfCheck.status === 'queued') {
      log('Cloudflare Pages deployment is queued. Waiting...');
      await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
    } else if (cfCheck.status === 'in_progress') {
      log(`Cloudflare Pages deployment is ${attempt < 2 ? '' : 'still '}in progress. Waiting...`);
      await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
    } else if (cfCheck.status === 'completed') {
      log('Cloudflare Pages status updated...');

      if (cfCheck.conclusion === 'success') {
        log('✓ Cloudflare Pages deployment successful!');
        return;
      }

      throw new Error(`Cloudflare Pages deployment failed with conclusion: ${cfCheck.conclusion}`);
    }
  }
}

module.exports = waitForCloudflarePagesDeployment;
