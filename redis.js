import Redis from 'ioredis';

const REDIS_PUBLIC_ENDPOINT = process.env.REDIS_PUBLIC_ENDPOINT;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

if (!REDIS_PUBLIC_ENDPOINT) {
    throw Error('REDIS_PUBLIC_ENDPOINT is a required environment variable');
}

if (!REDIS_PASSWORD) {
    throw Error('REDIS_PASSWORD is a required environment variable');
}

/**
 * @type {import('ioredis').Redis}
 */
const redis = new Redis(REDIS_PUBLIC_ENDPOINT, {
    username: 'default',
    password: REDIS_PASSWORD,
});
console.log('Clear Tab Connected to Redis');

export default redis;
