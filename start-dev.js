const { spawn } = require('child_process');
const path = require('path');

const next = spawn('node', [
  path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'),
  'dev'
], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3000' }
});

next.on('exit', (code) => process.exit(code));
