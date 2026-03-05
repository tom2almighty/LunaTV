import { getDb } from '@/lib/sqlite';

export type PlaySessionRecord = {
  sessionId: string;
  username: string;
  payloadJson: string;
  expiresAt: number;
  updatedAt: number;
};

function toRecord(
  row:
    | {
        session_id: string;
        username: string;
        payload_json: string;
        expires_at: number;
        updated_at: number;
      }
    | undefined,
): PlaySessionRecord | null {
  if (!row) {
    return null;
  }

  return {
    sessionId: row.session_id,
    username: row.username,
    payloadJson: row.payload_json,
    expiresAt: row.expires_at,
    updatedAt: row.updated_at,
  };
}

function upsert(record: PlaySessionRecord): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO play_sessions (
      session_id, username, payload_json, expires_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(session_id)
    DO UPDATE SET
      username = excluded.username,
      payload_json = excluded.payload_json,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at`,
  ).run(
    record.sessionId,
    record.username,
    record.payloadJson,
    record.expiresAt,
    record.updatedAt,
  );
}

function getBySessionId(sessionId: string): PlaySessionRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT session_id, username, payload_json, expires_at, updated_at
       FROM play_sessions
       WHERE session_id = ?`,
    )
    .get(sessionId) as
    | {
        session_id: string;
        username: string;
        payload_json: string;
        expires_at: number;
        updated_at: number;
      }
    | undefined;
  return toRecord(row);
}

function deleteExpired(now: number): number {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM play_sessions WHERE expires_at <= ?')
    .run(now);
  return result.changes || 0;
}

function trimToLimit(maxCount: number): number {
  if (maxCount <= 0) return 0;

  const db = getDb();
  const countRow = db
    .prepare('SELECT COUNT(1) AS count FROM play_sessions')
    .get() as { count: number };

  const overflow = Math.max(0, countRow.count - maxCount);
  if (overflow === 0) return 0;

  const rows = db
    .prepare(
      `SELECT session_id
       FROM play_sessions
       ORDER BY updated_at ASC
       LIMIT ?`,
    )
    .all(overflow) as Array<{ session_id: string }>;

  const deleteStmt = db.prepare(
    'DELETE FROM play_sessions WHERE session_id = ?',
  );
  for (const row of rows) {
    deleteStmt.run(row.session_id);
  }

  return rows.length;
}

export const playSessionRepository = {
  upsert,
  getBySessionId,
  deleteExpired,
  trimToLimit,
};
