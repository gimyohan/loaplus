import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { syncAutoManagedTargets } from '../lib/homeworkDefaults.js'
import type { CharacterBanner, CharacterSibling } from '../lib/lostarkApi.js'
import { fetchCharacterBanner, fetchCharacterSiblings, LostarkApiError } from '../lib/lostarkApi.js'
import { checkSharedKeyThrottle, resolveLostarkApiKey } from '../lib/lostarkKeyResolution.js'
import { requireAuth } from '../lib/session.js'

const registerCharacterSchema = z.object({
  characterName: z.string().trim().min(1),
})

/** Open API 조회 실패를 적절한 상태코드로 응답하고 null을 반환한다. 성공하면 배너 데이터를 반환한다. */
async function fetchBannerOrRespondError(
  request: FastifyRequest,
  reply: FastifyReply,
  characterName: string,
  apiKey: string,
): Promise<CharacterBanner | null> {
  try {
    return await fetchCharacterBanner(characterName, apiKey)
  } catch (err) {
    if (err instanceof LostarkApiError) {
      if (err.kind === 'not_found') {
        reply.code(404).send({ error: 'character_not_found' })
        return null
      }
      if (err.kind === 'rate_limited') {
        reply.code(429).send({ error: 'lostark_api_rate_limited' })
        return null
      }
      if (err.kind === 'unauthorized') {
        reply.code(400).send({ error: 'lostark_key_invalid' })
        return null
      }
    }
    request.log.error({ err }, 'lostark api request failed')
    reply.code(502).send({ error: 'lostark_api_unavailable' })
    return null
  }
}

/** Open API 조회 실패를 적절한 상태코드로 응답하고 null을 반환한다. 성공하면 원정대 캐릭터 목록을 반환한다. */
async function fetchSiblingsOrRespondError(
  request: FastifyRequest,
  reply: FastifyReply,
  characterName: string,
  apiKey: string,
): Promise<CharacterSibling[] | null> {
  try {
    return await fetchCharacterSiblings(characterName, apiKey)
  } catch (err) {
    if (err instanceof LostarkApiError) {
      if (err.kind === 'not_found') {
        reply.code(404).send({ error: 'character_not_found' })
        return null
      }
      if (err.kind === 'rate_limited') {
        reply.code(429).send({ error: 'lostark_api_rate_limited' })
        return null
      }
      if (err.kind === 'unauthorized') {
        reply.code(400).send({ error: 'lostark_key_invalid' })
        return null
      }
    }
    request.log.error({ err }, 'lostark api request failed')
    reply.code(502).send({ error: 'lostark_api_unavailable' })
    return null
  }
}

function toSiblingResponse(sibling: CharacterSibling) {
  return {
    serverName: sibling.serverName,
    characterName: sibling.characterName,
    characterLevel: sibling.characterLevel,
    className: sibling.className,
    itemLevel: sibling.itemLevel,
  }
}

function toCharacterResponse(character: {
  id: string
  serverName: string
  characterName: string
  itemLevel: number
  combatPower: number
  className: string
  imageUrl: string | null
}) {
  return {
    id: character.id,
    serverName: character.serverName,
    characterName: character.characterName,
    itemLevel: character.itemLevel,
    combatPower: character.combatPower,
    className: character.className,
    imageUrl: character.imageUrl,
  }
}

export async function characterRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  /**
   * 개인 키(없으면 공용 키)를 확보한다. 공용 키를 쓰는 경우에만 유저당 쿨다운을 검사한다
   * (docs/api.typ "외부 API 연동 세부사항" 참고). 실패 시 적절한 상태코드를 직접 응답하고
   * null을 반환한다.
   */
  async function resolveApiKeyOrRespondError(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const resolved = await resolveLostarkApiKey(fastify.prisma, request.userId!)
    if (!resolved) {
      reply.code(400).send({ error: 'lostark_key_required' })
      return null
    }
    if (resolved.source === 'shared') {
      const throttle = checkSharedKeyThrottle(request.userId!)
      if (!throttle.allowed) {
        reply.code(429).send({ error: 'lostark_shared_key_throttled', retryAfterSeconds: throttle.retryAfterSeconds })
        return null
      }
    }
    return resolved.apiKey
  }

  fastify.get('/api/characters', { preHandler: auth }, async (request, reply) => {
    const characters = await fastify.prisma.character.findMany({
      where: { userId: request.userId! },
    })
    return reply.send(characters.map(toCharacterResponse))
  })

  fastify.get<{ Params: { characterId: string } }>(
    '/api/characters/:characterId',
    { preHandler: auth },
    async (request, reply) => {
      const character = await fastify.prisma.character.findFirst({
        where: { id: request.params.characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }
      return reply.send(toCharacterResponse(character))
    },
  )

  fastify.post('/api/characters', { preHandler: auth }, async (request, reply) => {
    const parsed = registerCharacterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const apiKey = await resolveApiKeyOrRespondError(request, reply)
    if (!apiKey) return

    const banner = await fetchBannerOrRespondError(
      request,
      reply,
      parsed.data.characterName,
      apiKey,
    )
    if (!banner) return

    // 새 카드는 대시보드 맨 뒤에 추가되도록, 이 유저의 현재 최대 display_order 다음 값을 배정한다.
    const { _max } = await fastify.prisma.character.aggregate({
      where: { userId: request.userId! },
      _max: { displayOrder: true },
    })
    const displayOrder = (_max.displayOrder ?? -1) + 1

    const character = await fastify.prisma.character.create({
      data: {
        userId: request.userId!,
        serverName: banner.serverName,
        characterName: banner.characterName,
        itemLevel: banner.itemLevel,
        combatPower: banner.combatPower,
        className: banner.className,
        imageUrl: banner.imageUrl,
        displayOrder,
      },
    })

    return reply.code(201).send(toCharacterResponse(character))
  })

  fastify.get<{ Params: { characterName: string } }>(
    '/api/characters/lookup/:characterName/siblings',
    { preHandler: auth },
    async (request, reply) => {
      const apiKey = await resolveApiKeyOrRespondError(request, reply)
      if (!apiKey) return

      const siblings = await fetchSiblingsOrRespondError(
        request,
        reply,
        request.params.characterName,
        apiKey,
      )
      if (!siblings) return

      return reply.send(siblings.map(toSiblingResponse))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/refresh',
    { preHandler: auth },
    async (request, reply) => {
      const character = await fastify.prisma.character.findFirst({
        where: { id: request.params.characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }

      const apiKey = await resolveApiKeyOrRespondError(request, reply)
      if (!apiKey) return

      const banner = await fetchBannerOrRespondError(
        request,
        reply,
        character.characterName,
        apiKey,
      )
      if (!banner) return

      const updated = await fastify.prisma.character.update({
        where: { id: character.id },
        data: {
          serverName: banner.serverName,
          characterName: banner.characterName,
          itemLevel: banner.itemLevel,
          combatPower: banner.combatPower,
          className: banner.className,
          imageUrl: banner.imageUrl,
        },
      })

      // 아이템 레벨이 바뀌었으니, 유저가 직접 대상을 고르지 않은(target_auto_managed) 콘텐츠는
      // 새 레벨 기준 최고 목표로 다시 맞춘다.
      await syncAutoManagedTargets(fastify.prisma, character.id, updated.itemLevel)

      return reply.send(toCharacterResponse(updated))
    },
  )

  fastify.delete<{ Params: { characterId: string } }>(
    '/api/characters/:characterId',
    { preHandler: auth },
    async (request, reply) => {
      const { count } = await fastify.prisma.character.deleteMany({
        where: { id: request.params.characterId, userId: request.userId! },
      })
      if (count === 0) {
        return reply.code(404).send({ error: 'character_not_found' })
      }
      return reply.code(204).send()
    },
  )
}
