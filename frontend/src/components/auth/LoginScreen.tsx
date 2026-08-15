import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

export function LoginScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 text-foreground">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">LoaPlus</h1>
        <p className="text-sm text-muted-foreground">Google 계정으로 로그인해 숙제 대시보드를 시작하세요.</p>
      </div>
      <GoogleLoginButton />
    </div>
  )
}
