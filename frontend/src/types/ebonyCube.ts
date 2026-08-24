// docs/widgets.typ - 에브니 큐브(Ebony Cube) 위젯. 등급(입장권 종류)이 4개로 고정돼 있어
// (docs/db_schema.typ의 Ebony_Cubes 참고) 정규화된 목록 대신 고정 키 4개로 다룬다.
export type TicketType = 'unlock1' | 'unlock2' | 'unlock3' | 'unlock4'

export interface EbonyCubeSummary {
  /** 좌우 화살표로 선택된, 지금 소모 대상인 입장권 등급. 보유 입장권이 하나도 없으면 null */
  selectedTicketType: TicketType | null
  /** 등급별 보유 수량 */
  tickets: Record<TicketType, number>
}
