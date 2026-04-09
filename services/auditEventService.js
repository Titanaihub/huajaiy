const crypto = require("crypto");
const { getPool } = require("../db/pool");

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

function normalizePayload(v) {
  if (v == null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return null;
  return v;
}

function trimOrNull(v, max = 120) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/**
 * @param {import("pg").PoolClient} client
 * @param {{
 *   actorUserId?: string | null;
 *   targetUserId?: string | null;
 *   eventType: string;
 *   entityType?: string | null;
 *   entityId?: string | null;
 *   traceId?: string | null;
 *   payload?: Record<string, unknown> | null;
 * }} event
 */
async function recordWithClient(client, event) {
  const eventType = trimOrNull(event?.eventType, 80);
  if (!eventType) {
    const e = new Error("eventType required");
    e.code = "VALIDATION";
    throw e;
  }
  const payload = normalizePayload(event?.payload);
  await client.query(
    `INSERT INTO audit_events (
      id, actor_user_id, target_user_id, event_type, entity_type, entity_id, trace_id, payload
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::text, $7::text, $8::jsonb)`,
    [
      crypto.randomUUID(),
      event?.actorUserId || null,
      event?.targetUserId || null,
      eventType,
      trimOrNull(event?.entityType, 64),
      trimOrNull(event?.entityId, 120),
      trimOrNull(event?.traceId, 80),
      payload
    ]
  );
}

async function record(event) {
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await recordWithClient(client, event);
  } finally {
    client.release();
  }
}

async function listEventsForAdmin(opts = {}) {
  const pool = requirePool();
  const limit = Math.min(2000, Math.max(1, Math.floor(Number(opts.limit) || 200)));
  const offset = Math.max(0, Math.floor(Number(opts.offset) || 0));
  const actorUserId = trimOrNull(opts.actorUserId, 120);
  const targetUserId = trimOrNull(opts.targetUserId, 120);
  const eventType = trimOrNull(opts.eventType, 80);
  const entityType = trimOrNull(opts.entityType, 64);
  const entityId = trimOrNull(opts.entityId, 120);

  const where = [];
  const params = [];
  if (actorUserId) {
    params.push(actorUserId);
    where.push(`actor_user_id = $${params.length}::uuid`);
  }
  if (targetUserId) {
    params.push(targetUserId);
    where.push(`target_user_id = $${params.length}::uuid`);
  }
  if (eventType) {
    params.push(eventType);
    where.push(`event_type = $${params.length}`);
  }
  if (entityType) {
    params.push(entityType);
    where.push(`entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    where.push(`entity_id = $${params.length}`);
  }
  params.push(limit);
  params.push(offset);

  const sql = `SELECT id, actor_user_id AS "actorUserId", target_user_id AS "targetUserId",
      event_type AS "eventType", entity_type AS "entityType", entity_id AS "entityId",
      trace_id AS "traceId", payload, created_at AS "createdAt"
    FROM audit_events
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const r = await pool.query(sql, params);
  return r.rows;
}

module.exports = {
  record,
  recordWithClient,
  listEventsForAdmin
};
