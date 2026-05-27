// import Redis from 'ioredis';

// const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';


// const redisClient = new Redis(redisUrl, {
//   maxRetriesPerRequest: null,
// });

// export default redisClient;

// backend/src/config/Redis.ts
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,           // ← won't crash on startup
  enableOfflineQueue: false,   // ← fail fast instead of queuing forever
});

redisClient.on('error', (err) => {
  console.warn('[Redis] Connection error:', err.message);
});

export default redisClient;