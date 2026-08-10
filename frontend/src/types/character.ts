// docs/widgets.typ - 배너(Banner) 위젯 표시 정보: 캐릭터 이미지, 서버 이름, 캐릭터 이름, 아이템 레벨, 전투력 레벨
export interface CharacterSummary {
  imageUrl?: string
  server: string
  characterName: string
  job: string
  itemLevel: number
  combatPower: number
}
