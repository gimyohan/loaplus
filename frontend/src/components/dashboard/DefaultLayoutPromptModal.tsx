import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export interface DefaultLayoutPromptModalProps {
  open: boolean
  characterName: string
  onApplyDefault: () => void
  onKeepCurrent: () => void
}

/**
 * 위젯 설정에서 캐릭터 이름을 적용했는데 서버에 저장된 배치가 없을 때(신규 등록 캐릭터, 또는
 * 아직 위젯을 하나도 저장한 적 없는 캐릭터) 뜨는 선택 모달. 이름을 적용하기 전 이 카드에 미리
 * 놓아둔 위젯이 있었다면, 서버의 빈 배치로 그냥 덮어써버리면 그게 조용히 사라진다 — 그걸 막기
 * 위해 아이템 레벨 구간에 맞는 기본 배치를 적용할지, 지금 화면 그대로를 유지할지 명시적으로
 * 고르게 한다(사용자 확인). 닫기/배경 클릭/Esc는 전부 "현재 배치 유지"와 동일하게 취급한다 —
 * 둘 중 뭘 원하는지 모를 때는 아무것도 덮어쓰지 않는 쪽이 안전하기 때문이다.
 */
export function DefaultLayoutPromptModal({
  open,
  characterName,
  onApplyDefault,
  onKeepCurrent,
}: DefaultLayoutPromptModalProps) {
  return (
    <Modal open={open} onClose={onKeepCurrent} title={`${characterName}의 배치`} className="max-w-sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          이 캐릭터에는 아직 저장된 위젯 배치가 없습니다. 아이템 레벨에 맞는 기본 배치를 적용할까요,
          아니면 지금 이 카드에 놓여있는 배치를 그대로 유지할까요?
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onKeepCurrent}>
            현재 배치 유지
          </Button>
          <Button type="button" onClick={onApplyDefault}>
            기본 배치 적용
          </Button>
        </div>
      </div>
    </Modal>
  )
}
