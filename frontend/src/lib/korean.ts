/**
 * 마지막 글자의 받침 유무에 따라 "을"/"를"을 붙인다. 편린/아제나 축복 보상 아이템 이름처럼
 * 어떤 이름이 올지 미리 알 수 없는 동적인 문자열에 조사를 붙일 때 쓴다(고정 문구는 받침이
 * 항상 같은 글자로 끝나므로 굳이 계산할 필요 없이 하드코딩한다 — WidgetVisual.tsx의 "티켓을"
 * 참고). 한글 음절이 아닌 문자로 끝나면(영문/숫자 등) 그냥 "를"을 붙인다 — 이 앱에서 실제로
 * 조사가 필요한 이름은 전부 한글로 끝나므로 실용적으로 충분하다.
 */
export function withObjectParticle(word: string): string {
  const trimmed = word.trim()
  // "행복의 전설 카드 팩 (선택)"처럼 괄호로 끝나는 이름이 많아, 문자열 맨 끝 글자가 아니라
  // 뒤에서부터 찾은 첫 한글 음절의 받침으로 판단한다.
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const code = trimmed.charCodeAt(i)
    if (code >= 0xac00 && code <= 0xd7a3) {
      const hasFinalConsonant = (code - 0xac00) % 28 !== 0
      return `${trimmed}${hasFinalConsonant ? '을' : '를'}`
    }
  }
  return `${trimmed}를`
}
