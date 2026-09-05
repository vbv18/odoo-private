/**
 * lib/db-safe.ts
 *
 * A resilient DB wrapper. If PostgreSQL is unavailable (wrong password,
 * not running, etc.) it catches the error and returns a mock-data fallback
 * instead of throwing a 500. This allows the entire app to work offline.
 */

import { Pool } from 'pg';

let _pool: Pool | null = null;
let _dbAvailable: boolean | null = null; // null = not yet tested

function getPool(): Pool {
  if (!_pool) {
    _pool = process.env.DATABASE_URL
      ? new Pool({
          connectionString: process.env.DATABASE_URL,
          connectionTimeoutMillis: 3000,
          idleTimeoutMillis: 10000,
          max: 5,
        })
      : new Pool({
          host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
          port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
          database: process.env.DB_NAME || process.env.PGDATABASE || 'ledgercraft',
          user: process.env.DB_USER || process.env.PGUSER || 'postgres',
          password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres123',
          connectionTimeoutMillis: 3000, // fail fast
          idleTimeoutMillis: 10000,
          max: 5,
        });
  }
  return _pool;
}

/**
 * Test if DB is reachable. Caches the result for 60s so we don't
 * hammer the connection pool on every request.
 */
let _lastTestedAt = 0;
export async function isDbAvailable(): Promise<boolean> {
  const now = Date.now();
  // Re-test every 60 seconds
  if (_dbAvailable !== null && now - _lastTestedAt < 60_000) {
    return _dbAvailable;
  }
  try {
    const client = await getPool().connect();
    client.release();
    _dbAvailable = true;
    _lastTestedAt = now;
    return true;
  } catch {
    _dbAvailable = false;
    _lastTestedAt = now;
    return false;
  }
}

/**
 * Run a DB query. Returns { rows, rowCount } on success.
 * Throws on error so callers can handle it themselves.
 */
export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

/**
 * Run a DB query with a fallback.
 * If DB is unavailable OR the query throws, returns the fallback value.
 */
export async function dbQueryWithFallback<T>(
  text: string,
  params: unknown[],
  fallback: T
): Promise<T> {
  try {
    const available = await isDbAvailable();
    if (!available) return fallback;
    const result = await dbQuery(text, params);
    return result as unknown as T;
  } catch {
    return fallback;
  }
}

/**
 * Transactional helper. Runs a function with a client.
 * If DB unavailable, calls the fallback instead.
 */
export async function withTransaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  const available = await isDbAvailable();
  if (!available) return fallback();

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    // If it's a DB connection error, use fallback
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ECONNREFUSED' || error.code === '28P01' || error.code === '3D000') {
      _dbAvailable = false;
      return fallback();
    }
    throw err;
  } finally {
    client.release();
  }
}

export { getPool as pool };
