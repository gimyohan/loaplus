import type { Prisma } from '@prisma/client'
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

// 한 유저(user_id)가 등록할 수 있는 캐릭터 카드 최대 개수. 나중에 상향될 가능성이 높은 값이라
// 상수 하나로만 관리한다(docs/api.typ "캐릭터 등록 / 조회 / 삭제", docs/db_schema.typ의
// Characters 참고 — 이 제약은 DB CHECK가 아니라 등록 시점에 행 수를 세어 판단한다).
const MAX_CHARACTERS_PER_USER = 30

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
  equipment: unknown
  accessories: unknown
  abilityStone: unknown
  bracelet: unknown
  wristGuard: unknown
}) {
  return {
    id: character.id,
    serverName: character.serverName,
    characterName: character.characterName,
    itemLevel: character.itemLevel,
    combatPower: character.combatPower,
    className: character.className,
    imageUrl: character.imageUrl,
    // 상세 배너(BANNER_DETAILED, 10x4)용 필드. banner/bannerCompact는 위 필드까지만 쓰고
    // 이 5개는 무시한다 (docs/widgets.typ "배너" 참고).
    equipment: character.equipment,
    accessories: character.accessories,
    abilityStone: character.abilityStone,
    bracelet: character.bracelet,
    wristGuard: character.wristGuard,
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

  fastify.get(
    '/api/characters',
    { preHandler: auth, schema: { tags: ['Characters'], summary: '내 계정에 등록된 캐릭터(배너) 목록 조회' } },
    async (request, reply) => {
      const characters = await fastify.prisma.character.findMany({
        where: { userId: request.userId! },
      })
      return reply.send(characters.map(toCharacterResponse))
    },
  )

  fastify.get<{ Params: { characterId: string } }>(
    '/api/characters/:characterId',
    { preHandler: auth, schema: { tags: ['Characters'], summary: '캐릭터 배너 정보 단건 조회' } },
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

  fastify.post(
    '/api/characters',
    { preHandler: auth, schema: { tags: ['Characters'], summary: '캐릭터 신규 등록' } },
    async (request, reply) => {
    const parsed = registerCharacterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    // 로스트아크 Open API를 호출하기 전에 먼저 확인한다 — 어차피 거부할 등록 요청 때문에 개인/공용
    // 키의 분당 호출 한도를 소모하지 않기 위함(docs/api.typ "캐릭터 등록 / 조회 / 삭제" 참고).
    const existingCount = await fastify.prisma.character.count({ where: { userId: request.userId! } })
    if (existingCount >= MAX_CHARACTERS_PER_USER) {
      return reply.code(422).send({ error: 'character_limit_reached' })
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

    // 가디언/쿠르잔 전선/낙원/레이드 등 이 서비스가 다루는 컨텐츠가 대부분 1,640 이상을 전제로
    // 하므로, 그 아래 레벨은 등록 시점에 거부한다(docs/api.typ "캐릭터 등록 / 조회 / 삭제" 참고).
    // 등록 이후에도 이 하한은 항상 유지된다 — POST .../refresh는 Open API가 알려주는 값을 그대로
    // 덮어쓰지 않고 기존 저장값과의 GREATEST로 저장해, 인게임에서 장비를 일시적으로 해제하는 등
    // 공식적인 하락이 아닌 이유로 1,640 밑으로 내려가는 걸 막는다(POST .../refresh 참고).
    if (banner.itemLevel < 1640) {
      return reply.code(422).send({ error: 'item_level_too_low' })
    }

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
        equipment: banner.equipment as unknown as Prisma.InputJsonValue,
        accessories: banner.accessories as unknown as Prisma.InputJsonValue,
        abilityStone: banner.abilityStone as unknown as Prisma.InputJsonValue,
        bracelet: banner.bracelet as unknown as Prisma.InputJsonValue,
        wristGuard: banner.wristGuard as unknown as Prisma.InputJsonValue,
      },
    })

    return reply.code(201).send(toCharacterResponse(character))
  })

  fastify.get<{ Params: { characterName: string } }>(
    '/api/characters/lookup/:characterName/siblings',
    { preHandler: auth, schema: { tags: ['Characters'], summary: '원정대 캐릭터 일괄 조회' } },
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
    { preHandler: auth, schema: { tags: ['Characters'], summary: '캐릭터 배너 정보 새로고침' } },
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

      // 아이템 레벨이 1,640 밑으로 내려오는 건 시즌 개편 같은 공식적인 하락이 아니라 유저가
      // 인게임에서 장비를 일시적으로 해제하는 등으로 생기는 일시적 현상이라, 여기서 받은 값을
      // 그대로 덮어쓰지 않고 기존 저장값과 비교해 더 큰 쪽을 저장한다 — 한 번 도달한 레벨 밑으로는
      // 내려가지 않아야 DB의 CHECK (item_level >= 1640) 제약(마이그레이션
      // 20260823130000_readd_characters_item_level_min_check)도 항상 만족한다.
      const itemLevel = Math.max(character.itemLevel, banner.itemLevel)

      const updated = await fastify.prisma.character.update({
        where: { id: character.id },
        data: {
          serverName: banner.serverName,
          characterName: banner.characterName,
          itemLevel,
          combatPower: banner.combatPower,
          className: banner.className,
          imageUrl: banner.imageUrl,
          equipment: banner.equipment as unknown as Prisma.InputJsonValue,
          accessories: banner.accessories as unknown as Prisma.InputJsonValue,
          abilityStone: banner.abilityStone as unknown as Prisma.InputJsonValue,
          bracelet: banner.bracelet as unknown as Prisma.InputJsonValue,
          wristGuard: banner.wristGuard as unknown as Prisma.InputJsonValue,
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
    { preHandler: auth, schema: { tags: ['Characters'], summary: '캐릭터 카드 삭제' } },
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
