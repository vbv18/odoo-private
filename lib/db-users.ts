import { PoolClient } from 'pg';
import { pool } from '@/lib/db';
import { isDbAvailable } from '@/lib/db-safe';
import { normalizeRole } from '@/lib/roles';
import { StoredUser, findUserById, getAllStoredUsers } from '@/lib/users';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Queryable = Pick<PoolClient, 'query'> | typeof pool;

/** Upsert a file-based user into PostgreSQL so created_by FKs work for all roles. */
export async function ensureDbUser(user: StoredUser, client?: PoolClient): Promise<void> {
  if (!(await isDbAvailable())) return;

  const q: Queryable = client || pool;
  const role = normalizeRole(user.role);

  await q.query(
    `INSERT INTO users (id, login_id, email, full_name, password_hash, role, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET
       login_id = EXCLUDED.login_id,
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
       role = EXCLUDED.role,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP`,
    [
      user.id,
      user.login_id,
      user.email,
      user.full_name,
      user.password_hash,
      role,
      user.is_active !== false,
    ]
  );
}

/** Return user id only when it exists in PostgreSQL (auto-syncs from users.json if needed). */
export async function resolveCreatedBy(
  userId: string | undefined | null,
  client?: PoolClient
): Promise<string | null> {
  if (!userId || !UUID_RE.test(userId)) return null;
  if (!(await isDbAvailable())) return null;

  const q: Queryable = client || pool;
  const existing = await q.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (existing.rowCount && existing.rowCount > 0) return userId;

  const fileUser = findUserById(userId);
  if (!fileUser) return null;

  await ensureDbUser(fileUser, client);
  return userId;
}

/** Sync every file-based user into PostgreSQL (run on login). */
export async function syncAllFileUsersToDb(): Promise<void> {
  if (!(await isDbAvailable())) return;
  for (const user of getAllStoredUsers()) {
    if (user.is_active) {
      await ensureDbUser(user);
    }
  }
}
