import type { FastifyInstance } from 'fastify'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/health',
    { schema: { tags: ['Health'], summary: '헬스체크' } },
    async () => {
      return { status: 'ok' }
    },
  )
}
