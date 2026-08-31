import type { FastifyInstance } from 'fastify'

import { guardianHomeworkRoutes } from './guardian.js'
import { kurzanHomeworkRoutes } from './kurzan.js'
import { paradiseHomeworkRoutes } from './paradise.js'
import { homeworkSharedRoutes } from './shared.js'

/**
 * guardian/kurzanFrontline/paradise 세 위젯의 홈워크 CRUD를 각자의 파일로 나눠 등록한다
 * (raids.ts/ebonyCubeHalHourglass.ts처럼 콘텐츠 도메인별로 라우트 파일을 쪼개는 이 저장소의
 * 기존 관례를 따른 것). 타입 경계를 가로지르는 두 엔드포인트(GET /homeworks 전체 조회, POST
 * /other-income)는 어느 한 위젯에도 속하지 않으므로 shared.ts에 남는다.
 */
export async function homeworkRoutes(fastify: FastifyInstance) {
  await fastify.register(homeworkSharedRoutes)
  await fastify.register(guardianHomeworkRoutes)
  await fastify.register(kurzanHomeworkRoutes)
  await fastify.register(paradiseHomeworkRoutes)
}
