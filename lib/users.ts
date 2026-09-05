import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type StoredUser = {
  id: string;
  login_id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: string;
  is_active: boolean;
};

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'users.json');

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

export function loginIdFromEmail(email: string): string {
  const local = (email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9]/g, '');
  if (local.length >= 6 && local.length <= 12) return local;
  if (local.length > 12) return local.slice(0, 12);
  return `${local}000000`.slice(0, 6);
}

export function findUserByLoginOrEmail(identifier: string): StoredUser | undefined {
  const key = identifier.trim().toLowerCase();
  return readUsers().find(
    (user) =>
      user.is_active &&
      (user.login_id.toLowerCase() === key || user.email.toLowerCase() === key)
  );
}

export function createUser(input: {
  loginId?: string;
  email: string;
  passwordHash: string;
  name?: string;
  role?: string;
}): StoredUser {
  const users = readUsers();
  const email = input.email.trim().toLowerCase();
  const loginId = (input.loginId || loginIdFromEmail(email)).trim();

  const exists = users.some(
    (user) =>
      user.login_id.toLowerCase() === loginId.toLowerCase() ||
      user.email.toLowerCase() === email
  );

  if (exists) {
    const error = new Error('Login ID or email already exists');
    (error as Error & { status: number }).status = 409;
    throw error;
  }

  const user: StoredUser = {
    id: randomUUID(),
    login_id: loginId,
    email,
    full_name: input.name || loginId,
    password_hash: input.passwordHash,
    role: input.role || 'user',
    is_active: true,
  };

  users.push(user);
  writeUsers(users);
  return user;
}
