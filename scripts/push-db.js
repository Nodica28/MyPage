import { execSync } from 'child_process';

try {
  console.log('Pushing schema to database...');
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
  console.log('Schema pushed successfully!');
} catch (error) {
  console.error('Error pushing schema:', error);
  process.exit(1);
}