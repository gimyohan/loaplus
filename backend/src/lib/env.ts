import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  GOOGLE_CLIENT_ID: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  LOSTARK_KEY_ENCRYPTION_SECRET: z.string().min(1),
})

export const env = envSchema.parse(process.env)
