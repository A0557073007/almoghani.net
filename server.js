import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

const { Pool } = pg;
const app = express();
const httpServer = http.createServer(app);
const port = Number(process.env.PORT || 4000);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) || '*' }));
app.use(express.json({ limit: '1mb' }));

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) || '*',
    methods: ['GET', 'POST'],
  },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STREAM_STATUSES = new Set(['offline', 'scheduled', 'live', 'ended', 'error']);
const VISIBILITIES = new Set(['public', 'private', 'unlisted']);
const streamRooms = (streamId) => `stream:${streamId}`;
const socketStreams = new Map();

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function httpError(status, message, details = undefined) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function requireUuid(value, field = 'id') {
  if (!isUuid(value)) throw httpError(400, `${field} must be a valid UUID`);
}

function parsePagination(query) {
  const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

function requireText(value, field, max = 200) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw httpError(400, `${field} is required`);
  }
  if (value.trim().length > max) throw httpError(400, `${field} exceeds ${max} characters`);
  return value.trim();
}

function optionalText(value, field, max = 200) {
  if (value === undefined || value === null) return null;
  return requireText(value, field, max);
}

function parseBoolean(value, field) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw httpError(400, `${field} must be true or false`);
}

function parseDate(value, field) {
  if (value === undefined || value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw httpError(400, `${field} must be a valid ISO date`);
  return date.toISOString();
}

function serializeChannel(row) {
  return {
    id: row.id,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    slug: row.slug,
    descriptionAr: row.description_ar,
    logoUrl: row.logo_url,
    category: row.category_id ? { id: row.category_id, nameAr: row.category_name_ar, slug: row.category_slug } : null,
    playbackUrl: row.playback_url,
    isActive: row.is_active,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeStream(row) {
  return {
    id: row.id,
    channelId: row.channel_id,
    channel: row.channel_name_ar ? { nameAr: row.channel_name_ar, slug: row.channel_slug } : null,
    titleAr: row.title_ar,
    descriptionAr: row.description_ar,
    status: row.status,
    playbackUrl: row.playback_url,
    scheduledStartAt: row.scheduled_start_at,
    actualStartAt: row.actual_start_at,
    endedAt: row.ended_at,
    currentViewers: row.current_viewers,
    peakViewers: row.peak_viewers,
    totalViews: row.total_views,
    thumbnailUrl: row.thumbnail_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function syncRoomViewerCount(streamId) {
  const room = io.sockets.adapter.rooms.get(streamRooms(streamId));
  const currentViewers = room?.size ?? 0;
  const result = await pool.query(`
    UPDATE almoghani.live_streams
    SET current_viewers = $1,
        peak_viewers = GREATEST(peak_viewers, $1)
    WHERE id = $2
    RETURNING id, current_viewers, peak_viewers
  `, [currentViewers, streamId]);
  if (!result.rowCount) return null;
  await pool.query('INSERT INTO almoghani.stream_viewer_snapshots (stream_id, viewers) VALUES ($1, $2)', [streamId, currentViewers]);
  const payload = {
    streamId,
    currentViewers: result.rows[0].current_viewers,
    peakViewers: result.rows[0].peak_viewers,
    updatedAt: new Date().toISOString(),
  };
  io.to(streamRooms(streamId)).emit('stream:viewers_updated', payload);
  return payload;
}

const channelSelect = `
  SELECT c.id, c.name_ar, c.name_en, c.slug, c.description_ar,
         c.category_id, cat.name_ar AS category_name_ar, cat.slug AS category_slug,
         logo.public_url AS logo_url, c.playback_url, c.is_active, c.visibility,
         c.created_at, c.updated_at, COUNT(*) OVER() AS total_count
  FROM almoghani.channels c
  LEFT JOIN almoghani.categories cat ON cat.id = c.category_id
  LEFT JOIN almoghani.media_assets logo ON logo.id = c.logo_asset_id
`;

const streamSelect = `
  SELECT s.id, s.channel_id, c.name_ar AS channel_name_ar, c.slug AS channel_slug,
         s.title_ar, s.description_ar, s.status, s.playback_url,
         s.scheduled_start_at, s.actual_start_at, s.ended_at,
         s.current_viewers, s.peak_viewers, s.total_views,
         thumb.public_url AS thumbnail_url, s.created_at, s.updated_at
  FROM almoghani.live_streams s
  JOIN almoghani.channels c ON c.id = s.channel_id
  LEFT JOIN almoghani.media_assets thumb ON thumb.id = s.thumbnail_asset_id
`;

io.on('connection', (socket) => {
  socket.emit('socket:ready', { socketId: socket.id });

  socket.on('stream:join', async (payload = {}, acknowledge) => {
    try {
      requireUuid(payload.streamId, 'streamId');
      const result = await pool.query(`${streamSelect} WHERE s.id = $1`, [payload.streamId]);
      if (!result.rowCount) throw httpError(404, 'Stream not found');

      const previousStreamId = socketStreams.get(socket.id);
      if (previousStreamId && previousStreamId !== payload.streamId) {
        socket.leave(streamRooms(previousStreamId));
        socketStreams.delete(socket.id);
        await syncRoomViewerCount(previousStreamId);
      }

      socket.join(streamRooms(payload.streamId));
      socketStreams.set(socket.id, payload.streamId);
      await syncRoomViewerCount(payload.streamId);
      const response = { stream: serializeStream(result.rows[0]), room: streamRooms(payload.streamId) };
      socket.emit('stream:joined', response);
      if (typeof acknowledge === 'function') acknowledge({ ok: true, ...response });
    } catch (error) {
      const response = { ok: false, message: error.message };
      socket.emit('stream:error', response);
      if (typeof acknowledge === 'function') acknowledge(response);
    }
  });

  socket.on('stream:leave', async (payload = {}, acknowledge) => {
    const streamId = socketStreams.get(socket.id) || payload.streamId;
    if (streamId && isUuid(streamId)) {
      socket.leave(streamRooms(streamId));
      socketStreams.delete(socket.id);
      await syncRoomViewerCount(streamId).catch((error) => console.error(error));
    }
    if (typeof acknowledge === 'function') acknowledge({ ok: true });
  });

  socket.on('disconnect', async () => {
    const streamId = socketStreams.get(socket.id);
    socketStreams.delete(socket.id);
    if (streamId) await syncRoomViewerCount(streamId).catch((error) => console.error(error));
  });
});

app.get('/health', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT NOW() AS database_time');
    res.json({ ok: true, service: 'almoghani-api', database: 'connected', databaseTime: result.rows[0].database_time });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/channels?page=1&limit=20&categoryId=&search=&isActive=true
app.get('/api/v1/channels', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const values = [];
    const conditions = [];
    const add = (value) => { values.push(value); return `$${values.length}`; };

    if (req.query.categoryId) {
      requireUuid(req.query.categoryId, 'categoryId');
      conditions.push(`c.category_id = ${add(req.query.categoryId)}`);
    }
    if (req.query.search) {
      const search = requireText(req.query.search, 'search', 120);
      const placeholder = add(`%${search}%`);
      conditions.push(`(c.name_ar ILIKE ${placeholder} OR c.name_en ILIKE ${placeholder} OR c.slug ILIKE ${placeholder})`);
    }
    const isActive = parseBoolean(req.query.isActive, 'isActive');
    if (isActive !== undefined) conditions.push(`c.is_active = ${add(isActive)}`);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitPlaceholder = add(limit);
    const offsetPlaceholder = add(offset);
    const result = await pool.query(`${channelSelect} ${where} ORDER BY c.created_at DESC LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`, values);
    const total = result.rows[0]?.total_count ?? 0;

    res.json({ data: result.rows.map(serializeChannel), pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/channels/:id', async (req, res, next) => {
  try {
    requireUuid(req.params.id);
    const result = await pool.query(`${channelSelect} WHERE c.id = $1`, [req.params.id]);
    if (!result.rowCount) throw httpError(404, 'Channel not found');
    const streams = await pool.query(`${streamSelect} WHERE s.channel_id = $1 ORDER BY s.created_at DESC LIMIT 10`, [req.params.id]);
    res.json({ data: { ...serializeChannel(result.rows[0]), recentStreams: streams.rows.map(serializeStream) } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/channels', async (req, res, next) => {
  try {
    const nameAr = requireText(req.body.nameAr, 'nameAr');
    const nameEn = optionalText(req.body.nameEn, 'nameEn');
    const slug = requireText(req.body.slug, 'slug', 160).toLowerCase();
    const descriptionAr = optionalText(req.body.descriptionAr, 'descriptionAr', 5000);
    const categoryId = req.body.categoryId ?? null;
    const playbackUrl = optionalText(req.body.playbackUrl, 'playbackUrl', 2000);
    const visibility = req.body.visibility ?? 'public';
    const isActive = req.body.isActive ?? true;
    if (categoryId) requireUuid(categoryId, 'categoryId');
    if (!VISIBILITIES.has(visibility)) throw httpError(400, 'visibility is invalid');
    if (typeof isActive !== 'boolean') throw httpError(400, 'isActive must be boolean');

    const result = await pool.query(`
      INSERT INTO almoghani.channels (name_ar, name_en, slug, description_ar, category_id, playback_url, visibility, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `, [nameAr, nameEn, slug, descriptionAr, categoryId, playbackUrl, visibility, isActive]);

    const created = await pool.query(`${channelSelect} WHERE c.id = $1`, [result.rows[0].id]);
    res.status(201).json({ data: serializeChannel(created.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/channels/:id', async (req, res, next) => {
  try {
    requireUuid(req.params.id);
    const fields = [];
    const values = [];
    const allowed = {
      nameAr: ['name_ar', (v) => requireText(v, 'nameAr')],
      nameEn: ['name_en', (v) => optionalText(v, 'nameEn')],
      descriptionAr: ['description_ar', (v) => optionalText(v, 'descriptionAr', 5000)],
      categoryId: ['category_id', (v) => { if (v) requireUuid(v, 'categoryId'); return v || null; }],
      playbackUrl: ['playback_url', (v) => optionalText(v, 'playbackUrl', 2000)],
      visibility: ['visibility', (v) => { if (!VISIBILITIES.has(v)) throw httpError(400, 'visibility is invalid'); return v; }],
      isActive: ['is_active', (v) => { if (typeof v !== 'boolean') throw httpError(400, 'isActive must be boolean'); return v; }],
    };
    for (const [key, [column, transform]] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        values.push(transform(req.body[key]));
        fields.push(`${column} = $${values.length}`);
      }
    }
    if (!fields.length) throw httpError(400, 'No supported fields to update');
    values.push(req.params.id);
    const result = await pool.query(`UPDATE almoghani.channels SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id`, values);
    if (!result.rowCount) throw httpError(404, 'Channel not found');
    const updated = await pool.query(`${channelSelect} WHERE c.id = $1`, [req.params.id]);
    res.json({ data: serializeChannel(updated.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/v1/channels/:id', async (req, res, next) => {
  try {
    requireUuid(req.params.id);
    const result = await pool.query('UPDATE almoghani.channels SET is_active = FALSE WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rowCount) throw httpError(404, 'Channel not found');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/streams?status=live&channelId=&page=1&limit=20
app.get('/api/v1/streams', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const values = [];
    const conditions = [];
    const add = (value) => { values.push(value); return `$${values.length}`; };
    if (req.query.status) {
      if (!STREAM_STATUSES.has(req.query.status)) throw httpError(400, 'status is invalid');
      conditions.push(`s.status = ${add(req.query.status)}`);
    }
    if (req.query.channelId) {
      requireUuid(req.query.channelId, 'channelId');
      conditions.push(`s.channel_id = ${add(req.query.channelId)}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitPlaceholder = add(limit);
    const offsetPlaceholder = add(offset);
    const result = await pool.query(`${streamSelect} ${where} ORDER BY COALESCE(s.actual_start_at, s.scheduled_start_at, s.created_at) DESC LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`, values);
    res.json({ data: result.rows.map(serializeStream), pagination: { page, limit } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/streams/:id', async (req, res, next) => {
  try {
    requireUuid(req.params.id);
    const result = await pool.query(`${streamSelect} WHERE s.id = $1`, [req.params.id]);
    if (!result.rowCount) throw httpError(404, 'Stream not found');
    res.json({ data: serializeStream(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/streams', async (req, res, next) => {
  try {
    const channelId = req.body.channelId;
    requireUuid(channelId, 'channelId');
    const titleAr = requireText(req.body.titleAr, 'titleAr');
    const descriptionAr = optionalText(req.body.descriptionAr, 'descriptionAr', 5000);
    const status = req.body.status ?? 'scheduled';
    const playbackUrl = optionalText(req.body.playbackUrl, 'playbackUrl', 2000);
    const scheduledStartAt = parseDate(req.body.scheduledStartAt, 'scheduledStartAt');
    if (!STREAM_STATUSES.has(status)) throw httpError(400, 'status is invalid');

    const result = await pool.query(`
      INSERT INTO almoghani.live_streams (channel_id, title_ar, description_ar, status, playback_url, scheduled_start_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
    `, [channelId, titleAr, descriptionAr, status, playbackUrl, scheduledStartAt]);
    const created = await pool.query(`${streamSelect} WHERE s.id = $1`, [result.rows[0].id]);
    res.status(201).json({ data: serializeStream(created.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/streams/:id/status', async (req, res, next) => {
  try {
    requireUuid(req.params.id);
    const status = req.body.status;
    if (!STREAM_STATUSES.has(status)) throw httpError(400, 'status is invalid');
    const values = [status, req.params.id];
    const result = await pool.query(`
      UPDATE almoghani.live_streams
      SET status = $1,
          actual_start_at = CASE WHEN $1 = 'live' AND actual_start_at IS NULL THEN NOW() ELSE actual_start_at END,
          ended_at = CASE WHEN $1 = 'ended' THEN NOW() ELSE ended_at END
      WHERE id = $2
      RETURNING id
    `, values);
    if (!result.rowCount) throw httpError(404, 'Stream not found');
    const updated = await pool.query(`${streamSelect} WHERE s.id = $1`, [req.params.id]);
    io.to(streamRooms(req.params.id)).emit('stream:status_updated', serializeStream(updated.rows[0]));
    res.json({ data: serializeStream(updated.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/v1/streams/:id/viewers', async (req, res, next) => {
  try {
    requireUuid(req.params.id);
    const currentViewers = Number(req.body.currentViewers);
    if (!Number.isInteger(currentViewers) || currentViewers < 0) throw httpError(400, 'currentViewers must be a non-negative integer');
    const result = await pool.query(`
      UPDATE almoghani.live_streams
      SET current_viewers = $1,
          peak_viewers = GREATEST(peak_viewers, $1)
      WHERE id = $2
      RETURNING id
    `, [currentViewers, req.params.id]);
    if (!result.rowCount) throw httpError(404, 'Stream not found');
    await pool.query('INSERT INTO almoghani.stream_viewer_snapshots (stream_id, viewers) VALUES ($1, $2)', [req.params.id, currentViewers]);
    const updated = await pool.query(`${streamSelect} WHERE s.id = $1`, [req.params.id]);
    io.to(streamRooms(req.params.id)).emit('stream:viewers_updated', {
      streamId: req.params.id,
      currentViewers: updated.rows[0].current_viewers,
      peakViewers: updated.rows[0].peak_viewers,
      updatedAt: new Date().toISOString(),
    });
    res.json({ data: serializeStream(updated.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.use((_req, _res, next) => next(httpError(404, 'Route not found')));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === '23505') return res.status(409).json({ error: { message: 'A record with the same unique value already exists' } });
  if (error.code === '23503') return res.status(400).json({ error: { message: 'A referenced record does not exist' } });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'Invalid JSON body' } });
  const status = error.status || 500;
  return res.status(status).json({ error: { message: status === 500 ? 'Internal server error' : error.message, ...(error.details ? { details: error.details } : {}) } });
});

const server = httpServer.listen(port, '0.0.0.0', () => {
  console.log(`ALMOGHANI API listening on http://0.0.0.0:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
