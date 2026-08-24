import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

// 텍스트 · 체크박스 위젯의 카탈로그 기본 크기를 4x1 → 5x1로 바꾼 뒤(workspace/frontend/src/lib/widgetCatalog.ts),
// 그 이전에 이미 배치된 TEXT_CHECKBOX 인스턴스는 DB에 width=4로 그대로 남아 새 디자인(5:1
// 비율로 그려지는 ScaleToFit 원본 캔버스, workspace/frontend/src/components/dashboard/ScaleToFit.tsx)과
// 어긋나 렌더링된다. 실제 배치는 항상 카탈로그 기본값 그대로 생성되고 이후 리사이즈 UI가 없으므로
// (workspace/frontend/src/components/dashboard/WidgetDashboard.tsx), 이 어긋남은 카탈로그 기본값이
// 바뀐 시점 이전에 만들어진 행에만 존재한다 — 그 행들의 width를 5로 맞춰 최신 카탈로그와 다시
// 일치시킨다. 오른쪽으로 한 칸 넓어지므로, 같은 캐릭터의 같은 행(grid_y)에 그 칸을 이미 쓰는
// 다른 위젯이 있거나 그리드 폭을 넘으면 충돌이므로 건드리지 않고 건너뛴다.
async function main() {
  const prisma = new PrismaClient()

  try {
    const stale = await prisma.dashboardWidget.findMany({
      where: { widgetType: 'TEXT_CHECKBOX', width: 4 },
      include: { character: { select: { characterName: true, gridColumns: true } } },
    })

    if (stale.length === 0) {
      console.log('width=4인 TEXT_CHECKBOX 행이 없습니다 — 마이그레이션할 대상이 없습니다.')
      return
    }

    let migrated = 0
    let skipped = 0

    for (const widget of stale) {
      const newRightEdge = widget.gridX + 5

      if (newRightEdge > widget.character.gridColumns) {
        console.warn(
          `건너뜀(그리드 폭 초과): ${widget.character.characterName} — x=${widget.gridX}, 그리드 폭=${widget.character.gridColumns}`,
        )
        skipped += 1
        continue
      }

      const neighbors = await prisma.dashboardWidget.findMany({
        where: { characterId: widget.characterId, id: { not: widget.id } },
      })
      const hasCollision = neighbors.some(
        (n) =>
          n.gridX < newRightEdge &&
          n.gridX + n.width > widget.gridX &&
          n.gridY < widget.gridY + widget.height &&
          n.gridY + n.height > widget.gridY,
      )

      if (hasCollision) {
        console.warn(`건너뜀(충돌 감지): ${widget.character.characterName} — x=${widget.gridX}, y=${widget.gridY}`)
        skipped += 1
        continue
      }

      await prisma.dashboardWidget.update({ where: { id: widget.id }, data: { width: 5 } })
      console.log(`수정: ${widget.character.characterName} — x=${widget.gridX}, y=${widget.gridY} (4x1 → 5x1)`)
      migrated += 1
    }

    console.log(`완료: ${migrated}건 수정, ${skipped}건 건너뜀 (총 ${stale.length}건 대상)`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
