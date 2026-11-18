/** Settings from the environment. The defaults match docker-compose.yml, so no .env is needed. */
const env = (name: string, fallback: string) => process.env[name] ?? fallback;

export const config = {
  port: Number(env('PORT', '8080')),
  db: {
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '5433')),
    username: env('DB_USER', 'nox'),
    password: env('DB_PASSWORD', 'nox'),
    database: env('DB_NAME', 'nox'),
  },
  session: {
    cookieName: 'nox_session',
    ttlMs: 8 * 60 * 60 * 1000,
    /** Set to true behind HTTPS. Off by default so the demo works on http://localhost. */
    secureCookie: env('COOKIE_SECURE', 'false') === 'true',
  },
};
