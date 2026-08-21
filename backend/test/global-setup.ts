import { execSync } from 'child_process';
import * as path from 'path';

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '..');
  console.log('🔄 Initializing test database schema for E2E tests...');
  try {
    execSync('npx prisma db push --accept-data-loss', {
      cwd: backendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'file:./test_ci.db',
      },
    });
    console.log('✅ Test database schema ready.');
  } catch (err: any) {
    console.error('⚠️ Global test database initialization error:', err.message);
  }
}
