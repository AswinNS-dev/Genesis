const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const pythonCmd = isWindows ? 'python' : 'python3';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  🚀 Starting CrimeIntel Platform (Backend + Frontend)...   ');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[35m[BACKEND]\x1b[0m  FastAPI: http://localhost:8000 (Docs: /docs)');
console.log('\x1b[34m[FRONTEND]\x1b[0m React (Vite): http://localhost:3000\n');

// Spawn Python FastAPI backend
const backend = spawn(pythonCmd, ['-u', 'run.py'], {
  cwd: rootDir,
  shell: isWindows,
  stdio: 'pipe',
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
});

// Spawn Frontend Vite dev server
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  shell: isWindows,
  stdio: 'pipe',
  env: process.env
});

function pipeOutput(child, prefix, colorCode) {
  const format = (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`\x1b[${colorCode}m[${prefix}]\x1b[0m ${line}`);
      }
    }
  };

  child.stdout.on('data', format);
  child.stderr.on('data', format);
}

pipeOutput(backend, 'BACKEND', '35');  // Magenta
pipeOutput(frontend, 'FRONTEND', '34'); // Blue

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down CrimeIntel services...');
  try {
    if (isWindows) {
      if (backend.pid) spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t'], { shell: true });
      if (frontend.pid) spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t'], { shell: true });
    } else {
      backend.kill('SIGINT');
      frontend.kill('SIGINT');
    }
  } catch (err) {
    // Ignore cleanup errors
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

backend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\x1b[31m[BACKEND] Process exited with code ${code}\x1b[0m`);
  }
});

frontend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\x1b[31m[FRONTEND] Process exited with code ${code}\x1b[0m`);
  }
});
