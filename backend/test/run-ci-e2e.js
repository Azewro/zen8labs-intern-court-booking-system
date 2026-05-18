const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const https = require('https');

const logFile = path.resolve(__dirname, 'e2e.log');
const logStream = fs.createWriteStream(logFile);

console.log('[CI Test Runner] Starting E2E tests...');

// Spawn the test process: npm run test:e2e
const child = spawn('npm', ['run', 'test:e2e'], {
  cwd: path.resolve(__dirname, '..'), // backend/
  shell: true,
  env: { ...process.env },
});

child.stdout.on('data', (data) => {
  logStream.write(data);
});

child.stderr.on('data', (data) => {
  logStream.write(data);
});

child.on('close', (code) => {
  logStream.end(async () => {
    const logContent = fs.readFileSync(logFile, 'utf8');

    if (code !== 0) {
      console.error(`\n[CI Test Runner] E2E Tests FAILED with exit code ${code}.`);
      console.log('[CI Test Runner] Uploading logs to termbin.com for public inspection...');

      try {
        const termbinUrl = await uploadToTermbin(logContent);
        console.log(`\n============================================================`);
        console.log(`[CI Test Runner] E2E TEST LOGS UPLOADED SUCCESSFULLY!`);
        console.log(`DIRECT LINK TO RAW LOGS: ${termbinUrl}`);
        console.log(`============================================================\n`);

        // Update GitHub Commit Status
        await setCommitStatus(
          process.env.GITHUB_SHA,
          process.env.GITHUB_REPOSITORY,
          process.env.GITHUB_TOKEN,
          'failure',
          termbinUrl,
          'E2E Test Logs (Direct Link)'
        );
      } catch (err) {
        console.error('[CI Test Runner] Failed to upload logs to termbin:', err.message);
      }

      // Print logs to console so they are also in the standard GitHub Actions log
      console.log('\n--- E2E TEST STDOUT/STDERR LOGS ---');
      console.log(logContent);
      console.log('--- END OF LOGS ---\n');

      process.exit(1);
    } else {
      console.log('\n[CI Test Runner] E2E Tests PASSED successfully!');
      console.log('\n--- E2E TEST STDOUT/STDERR LOGS ---');
      console.log(logContent);
      console.log('--- END OF LOGS ---\n');
      process.exit(0);
    }
  });
});

function uploadToTermbin(content) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(9999, 'termbin.com', () => {
      client.write(content);
    });

    client.on('data', (data) => {
      resolve(data.toString().trim());
      client.destroy();
    });

    client.on('error', (err) => {
      reject(err);
    });
  });
}

function setCommitStatus(sha, repo, token, state, targetUrl, description) {
  return new Promise((resolve) => {
    if (!token || !repo || !sha) {
      console.log('[CI Test Runner] Skipping GitHub Commit Status update (missing env context)');
      return resolve();
    }

    const payload = JSON.stringify({
      state,
      target_url: targetUrl,
      description,
      context: 'integration-tests/logs',
    });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/statuses/${sha}`,
      method: 'POST',
      headers: {
        'User-Agent': 'NodeJS-CI-Runner',
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      console.log(`[CI Test Runner] GitHub Status update status code: ${res.statusCode}`);
      resolve();
    });

    req.on('error', (err) => {
      console.error(`[CI Test Runner] GitHub Status update error: ${err.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}
