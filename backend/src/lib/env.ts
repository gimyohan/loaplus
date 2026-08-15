import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  GOOGLE_CLIENT_ID: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  LOSTARK_KEY_ENCRYPTION_SECRET: z.string().min(1),
  // 거래소 시세 야간 배치(파이프라인 A) 전용 서버 키. 비어 있으면 배치 스케줄 자체를 등록하지 않는다
  // (docs/market_price.typ 참고).
  LOSTARK_BATCH_API_KEY: z.string().min(1).optional(),
  // 개인 키를 등록하지 않은 유저가 대신 쓰는 개발자 공용 키. 비어 있으면 개인 키 미등록 유저의
  // 요청은 종전처럼 400 lostark_key_required로 막힌다 (docs/api.typ "외부 API 연동 세부사항" 참고).
  LOSTARK_SHARED_API_KEY: z.string().min(1).optional(),
  // 공용 키를 쓰는 유저당 쿨다운(초). 여러 무등록 유저가 공용 키 하나의 분당 100회 한도를
  // 나눠 쓰기 때문에 필요하다 (docs/api.typ 동일 섹션 참고).
  LOSTARK_SHARED_KEY_THROTTLE_SECONDS: z.coerce.number().int().positive().default(30),
})

export const env = envSchema.parse(process.env)
