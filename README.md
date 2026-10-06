# ALMOGHANI Streaming API

Express + PostgreSQL API for channels and live streams.

## Requirements

- Node.js 20+
- PostgreSQL 15+
- The database schema from `/home/ubuntu/almoghani-db/schema.sql`

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

The API starts on `http://localhost:4000` by default.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API and database health check |
| GET | `/api/v1/channels` | List channels with pagination, search, category and active filters |
| GET | `/api/v1/channels/:id` | Get one channel and its recent streams |
| POST | `/api/v1/channels` | Create a channel |
| PATCH | `/api/v1/channels/:id` | Update supported channel fields |
| DELETE | `/api/v1/channels/:id` | Soft-deactivate a channel |
| GET | `/api/v1/streams` | List streams; supports `status`, `channelId`, `page`, `limit` |
| GET | `/api/v1/streams/:id` | Get one stream |
| POST | `/api/v1/streams` | Create a scheduled/live stream |
| PATCH | `/api/v1/streams/:id/status` | Set stream status and timestamps |
| PATCH | `/api/v1/streams/:id/viewers` | Update current/peak viewers and record a snapshot |

## Real-time updates with Socket.io

The same origin exposes a Socket.io endpoint at `ws://localhost:4000/socket.io`.
Each stream has a room named `stream:<STREAM_UUID>`.

Install the browser client in the frontend:

```bash
npm install socket.io-client
```

Join a stream room and listen for updates:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

socket.emit('stream:join', { streamId }, (response) => {
  if (!response.ok) console.error(response.message);
});

socket.on('stream:viewers_updated', (data) => {
  // data.currentViewers, data.peakViewers
  setViewerCount(data.currentViewers);
});

socket.on('stream:status_updated', (stream) => {
  // stream.status: offline | scheduled | live | ended | error
  setStreamStatus(stream.status);
});

socket.on('stream:error', console.error);

// On component cleanup:
socket.emit('stream:leave', { streamId });
socket.disconnect();
```

Available server events:

| Event | Direction | Purpose |
|---|---|---|
| `socket:ready` | server → client | Returns the connected socket ID |
| `stream:join` | client → server | Joins a stream room and counts the viewer |
| `stream:joined` | server → client | Returns the initial stream payload |
| `stream:leave` | client → server | Leaves a room and decrements the count |
| `stream:viewers_updated` | server → room | Broadcasts current and peak viewers |
| `stream:status_updated` | server → room | Broadcasts status changes made through the HTTP API |
| `stream:error` | server → client | Validation or database error |

Viewer counts are derived from active Socket.io connections in the room, persisted to
`live_streams.current_viewers`, and sampled in `stream_viewer_snapshots`. For multiple API
instances, use the Socket.io Redis adapter so rooms and broadcasts are shared across instances.

## Examples

```bash
curl http://localhost:4000/health
curl 'http://localhost:4000/api/v1/channels?page=1&limit=20&isActive=true'
curl 'http://localhost:4000/api/v1/streams?status=live'
```

Create a channel:

```bash
curl -X POST http://localhost:4000/api/v1/channels \
  -H 'Content-Type: application/json' \
  -d '{
    "nameAr": "قناة الأخبار",
    "nameEn": "News Channel",
    "slug": "news-channel",
    "descriptionAr": "بث إخباري مباشر",
    "visibility": "public",
    "isActive": true
  }'
```

Create a stream:

```bash
curl -X POST http://localhost:4000/api/v1/streams \
  -H 'Content-Type: application/json' \
  -d '{
    "channelId": "CHANNEL_UUID",
    "titleAr": "النشرة المباشرة",
    "status": "scheduled",
    "scheduledStartAt": "2026-10-06T18:00:00Z"
  }'
```

## Notes for production

- Add authentication and role-based authorization before exposing POST/PATCH/DELETE routes.
- Keep ingest stream keys hashed and never return them from API responses.
- Put the API behind HTTPS and a reverse proxy.
- Add rate limiting for public endpoints and an API key/JWT policy for viewer updates.
- Run the SQL schema as a migration, not on every application start.
