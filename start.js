import { spawn } from 'child_process';

console.log('Starting J.A.R.V.I.S ecosystem...');

const bridge = spawn('node', ['bridge-server.js'], { stdio: 'inherit' });

const viteCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const vite = spawn(viteCmd, ['vite'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  bridge.kill();
  vite.kill();
  process.exit();
});
