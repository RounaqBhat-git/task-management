import { config } from 'dotenv';
config();
import '../models';
import { syncDb } from '../db/sequelize';
import { User } from '../models';
import bcrypt from 'bcryptjs';
import { login } from '../services/authService';

async function run() {
  await syncDb({ force: false });

  // Upsert a throwaway admin for the smoke test
  const hash = await bcrypt.hash('testpass', 10);
  await User.upsert({
    id: 9999,
    name: 'Smoke Admin',
    email: 'smoke@test.local',
    passwordHash: hash,
    role: 'admin',
    isActive: true,
  });

  // 1. Valid login
  const result = await login('smoke@test.local', 'testpass');
  console.log('✓ login success — token starts with:', result.token.slice(0, 20) + '...');
  console.log('  user:', result.user);

  // 2. Wrong password
  try {
    await login('smoke@test.local', 'wrongpass');
    console.error('✗ should have thrown');
    process.exit(1);
  } catch (e: unknown) {
    const err = e as { message: string };
    console.log('✓ wrong password rejected:', err.message);
  }

  // 3. Unknown user
  try {
    await login('nobody@test.local', 'anything');
    console.error('✗ should have thrown');
    process.exit(1);
  } catch (e: unknown) {
    const err = e as { message: string };
    console.log('✓ unknown user rejected:', err.message);
  }

  // Clean up
  await User.destroy({ where: { id: 9999 } });
  console.log('✓ smoke user cleaned up');
  process.exit(0);
}

run().catch((e) => { console.error('FAIL', e); process.exit(1); });
