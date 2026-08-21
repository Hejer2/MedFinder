import { execSync } from 'child_process';
import * as path from 'path';

// Enforce test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test_e2e.db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_32_chars_minimum';
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || 'test_refresh_secret_key_32_chars';

// Push schema to ensure test database is ready and isolated
const backendDir = path.resolve(__dirname, '..');
try {
  execSync('npx prisma db push --accept-data-loss', {
    cwd: backendDir,
    stdio: 'ignore',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
} catch {
  // Silent fallback if already created
}
