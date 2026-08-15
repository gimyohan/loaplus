import { OAuth2Client } from 'google-auth-library'

import { env } from './env.js'

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)

/** 검증에 성공하면 Google 계정 고유 ID(sub)를 반환한다. */
export async function verifyGoogleIdToken(idToken: string): Promise<string> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  })

  const sub = ticket.getPayload()?.sub
  if (!sub) {
    throw new Error('Google ID token payload is missing sub')
  }

  return sub
}
