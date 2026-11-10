import { describe, expect, it } from 'vitest'

import { parseEffectLines } from '../lib/armoryDetailParsing'

function summaries(html: string) {
  return parseEffectLines(html).map(({ text, color }) => ({ text, color }))
}

// 실제 응답(공식 전투정보실, 2026-11-10)에서 옮긴 툴팁 본문.
const BRACELET_EFFECTS_HTML =
  "<img src='emoticon_tooltip_bracelet_locked' vspace='-5'></img> 신속 <FONT COLOR='#CE43FC'>+104</FONT><BR>" +
  "<img src='emoticon_tooltip_bracelet_locked' vspace='-5'></img> 특화 <FONT COLOR='#CE43FC'>+109</FONT><BR>" +
  "<img src='emoticon_tooltip_bracelet_locked' vspace='-5'></img> 백어택 스킬이 적에게 주는 피해가 <FONT COLOR='#CE43FC'>3%</FONT> 증가한다.<BR>" +
  "<img src='emoticon_tooltip_bracelet_locked' vspace='-5'></img> 스킬의 재사용 대기 시간이 <FONT COLOR='#ff9999'>2%</FONT> 증가하지만, 적에게 주는 피해가 <FONT COLOR='#CE43FC'>5%</FONT> 증가한다.<BR>" +
  "<img src='emoticon_tooltip_bracelet_changeable' width='20' height='20' vspace='-6'></img>치명타 피해가 <FONT COLOR='#CE43FC'>8.4%</FONT> 증가한다.<BR>" +
  "공격이 치명타로 적중 시 적에게 주는 피해가 <FONT COLOR='#99ff99'>1.5%</FONT> 증가한다."

const ACCESSORY_EFFECTS_HTML =
  "<img src='emoticon_sign_greenDot' width='0' height='0' vspace='-3'></img>적에게 주는 피해 <FONT color='FE9600'>+2.00%</FONT><br>" +
  "<img src='emoticon_sign_greenDot' width='0' height='0' vspace='-3'></img>추가 피해 <FONT COLOR='FE9600'>+2.60%</FONT><br>" +
  "<img src='emoticon_sign_greenDot' width='0' height='0' vspace='-3'></img>무기 공격력 <FONT COLOR='FE9600'>+960</FONT>"

describe('parseEffectLines', () => {
  it('팔찌 효과 5개를 모두 읽는다(문장 가운데 값, 값 여러 개, 이어지는 줄)', () => {
    expect(summaries(BRACELET_EFFECTS_HTML)).toEqual([
      { text: '신속 +104', color: '#CE43FC' },
      { text: '특화 +109', color: '#CE43FC' },
      { text: '백어택 스킬이 적에게 주는 피해가 3% 증가한다.', color: '#CE43FC' },
      { text: '스킬의 재사용 대기 시간이 2% 증가하지만, 적에게 주는 피해가 5% 증가한다.', color: '#CE43FC' },
      {
        text: '치명타 피해가 8.4% 증가한다. 공격이 치명타로 적중 시 적에게 주는 피해가 1.5% 증가한다.',
        color: '#CE43FC',
      },
    ])
  })

  it('장신구 연마 효과는 지금처럼 줄마다 하나씩 읽는다', () => {
    expect(summaries(ACCESSORY_EFFECTS_HTML)).toEqual([
      { text: '적에게 주는 피해 +2.00%', color: '#FE9600' },
      { text: '추가 피해 +2.60%', color: '#FE9600' },
      { text: '무기 공격력 +960', color: '#FE9600' },
    ])
  })

  it('수치만 색이 있는 조각으로 나눈다(공식 툴팁과 같은 색 범위)', () => {
    const effects = parseEffectLines(BRACELET_EFFECTS_HTML)
    expect(effects[0]!.segments).toEqual([
      { text: '신속 ', color: null },
      { text: '+104', color: '#CE43FC' },
    ])
    expect(effects[3]!.segments).toEqual([
      { text: '스킬의 재사용 대기 시간이 ', color: null },
      { text: '2%', color: '#FF9999' },
      { text: ' 증가하지만, 적에게 주는 피해가 ', color: null },
      { text: '5%', color: '#CE43FC' },
      { text: ' 증가한다.', color: null },
    ])
    expect(effects[4]!.segments).toEqual([
      { text: '치명타 피해가 ', color: null },
      { text: '8.4%', color: '#CE43FC' },
      { text: ' 증가한다.', color: null },
      { text: ' ', color: null },
      { text: '공격이 치명타로 적중 시 적에게 주는 피해가 ', color: null },
      { text: '1.5%', color: '#99FF99' },
      { text: ' 증가한다.', color: null },
    ])
  })

  it('값이 하나도 없는 효과 줄은 건너뛴다', () => {
    expect(parseEffectLines("<img src='x'></img>설명만 있는 줄<br>")).toEqual([])
  })
})
