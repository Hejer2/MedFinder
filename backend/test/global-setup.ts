import { execSync } from 'child_process';
import * as path from 'path';

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '..');
  let testDbUrl = process.env.DATABASE_URL || '';

  if (!testDbUrl || testDbUrl.startsWith('file:.')) {
    const dbName = testDbUrl ? path.basename(testDbUrl.replace('file:', '')) : 'test_e2e.db';
    const testDbFile = path.resolve(backendDir, 'prisma', dbName);
    testDbUrl = 'file:' + testDbFile.replace(/\\/g, '/');
  }

  console.log('🔄 Initializing test database schema for E2E tests at:', testDbUrl);
  try {
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      cwd: backendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
    });
    console.log('✅ Test database schema ready.');
  } catch (err: any) {
    console.error('Failed to initialize E2E test database in globalSetup:', err.message);
  }
}
