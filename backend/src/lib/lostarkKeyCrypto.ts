import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { env } from './env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

// LOSTARK_KEY_ENCRYPTION_SECRET은 32바이트를 hex로 인코딩한 값이어야 한다.
const key = Buffer.from(env.LOSTARK_KEY_ENCRYPTION_SECRET, 'hex')

/** 로스트아크 Open API 키를 평문으로 절대 저장하지 않기 위한 암/복호화 유틸. */
export function encryptLostarkApiKey(plainText: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.')
}

export function decryptLostarkApiKey(stored: string): string {
  const [ivB64, authTagB64, encryptedB64] = stored.split('.')
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error('Malformed encrypted lostark api key')
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
