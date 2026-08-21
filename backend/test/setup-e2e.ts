import * as path from 'path';

// Calculate deterministic absolute path to the isolated E2E test database
const backendDir = path.resolve(__dirname, '..');
const testDbFile = path.resolve(backendDir, 'prisma', 'test_e2e.db');
const testDbUrl = 'file:' + testDbFile.replace(/\\/g, '/');

// Enforce test environment variables in worker
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDbUrl;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_32_chars_minimum';
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || 'test_refresh_secret_key_32_chars';
