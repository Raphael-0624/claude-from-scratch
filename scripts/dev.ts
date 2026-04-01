// scripts/dev.ts
import { spawn } from 'child_process';
import chokidar from 'chokidar';

console.log('🚀 Starting dev server...\n');

// Initial build
const build = spawn('tsx', ['scripts/build.ts'], { stdio: 'inherit' });

build.on('close', (code) => {
  if (code !== 0) {
    console.error('Initial build failed');
    process.exit(1);
  }

  // Start HTTP server
  const server = spawn('python3', ['-m', 'http.server', '8080', '-d', 'dist'], {
    stdio: 'inherit'
  });

  console.log('\n🌐 Server running at http://localhost:8080\n');

  // Watch for changes
  const watcher = chokidar.watch(['src/**/*', 'static/**/*'], {
    ignored: /node_modules/,
    persistent: true
  });

  let isBuilding = false;

  watcher.on('change', async (path) => {
    if (isBuilding) return;

    console.log(`\n📝 Changed: ${path}`);
    console.log('🔨 Rebuilding...\n');

    isBuilding = true;

    const rebuild = spawn('tsx', ['scripts/build.ts'], { stdio: 'inherit' });

    rebuild.on('close', () => {
      isBuilding = false;
      console.log('\n✅ Rebuild complete\n');
    });
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    server.kill();
    watcher.close();
    process.exit(0);
  });
});
