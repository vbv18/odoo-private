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

export function getAllStoredUsers(): StoredUser[] {
  return readUsers();
}

export function findUserById(id: string): StoredUser | undefined {
  return readUsers().find((user) => user.id === id && user.is_active);
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
    role: input.role || 'Contact',
    is_active: true,
  };

  users.push(user);
  writeUsers(users);
  return user;
}

export function getAllUsers(): Omit<StoredUser, 'password_hash'>[] {
  return readUsers().map(({ password_hash, ...u }) => u);
}

export function getUserById(id: string): Omit<StoredUser, 'password_hash'> | undefined {
  const user = readUsers().find((u) => u.id === id);
  if (!user) return undefined;
  const { password_hash, ...rest } = user;
  return rest;
}

export function updateUser(
  id: string,
  data: Partial<Pick<StoredUser, 'full_name' | 'email' | 'role' | 'is_active'>>
): Omit<StoredUser, 'password_hash'> | undefined {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return undefined;

  users[index] = { ...users[index], ...data };
  writeUsers(users);
  const { password_hash, ...rest } = users[index];
  return rest;
}

export function deleteUser(id: string): boolean {
  const users = readUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  writeUsers(filtered);
  return true;
}
