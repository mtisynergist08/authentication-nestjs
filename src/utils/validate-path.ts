import { cleanEnv, str, port } from 'envalid';

export const env = cleanEnv(process.env, {
  PORT: port({ default: 8000 }),
  DATABASE_URL: str(),
  JWT_SECRET: str(),
});
