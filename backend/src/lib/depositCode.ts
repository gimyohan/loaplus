// docs/subscription.typ "무통장입금 식별자: Users.deposit_code" 참고. 혼동되는 문자(0/O, 1/I)를
// 제외해 은행 입금자명 필드에 손으로 옮겨 적어도 오타가 나기 어렵게 한다.
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const LENGTH = 6

export function generateDepositCode(): string {
  let code = ''
  for (let i = 0; i < LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}
