import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '..');
  const testDbFile = path.resolve(backendDir, 'prisma', 'test_e2e.db');
  const testDbUrl = 'file:' + testDbFile.replace(/\\/g, '/');

  try {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  } catch {
    // Ignored
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
