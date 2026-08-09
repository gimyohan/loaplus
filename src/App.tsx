import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CharacterBanner } from '@/components/character/CharacterBanner'
import { CharacterBannerCompact } from '@/components/character/CharacterBannerCompact'
import { WidgetDashboard } from '@/components/dashboard/WidgetDashboard'
import { GuardianWidget } from '@/components/widgets/GuardianWidget'
import { KurzanFrontlineSettingsModal } from '@/components/widgets/KurzanFrontlineSettingsModal'
import { KurzanFrontlineWidget } from '@/components/widgets/KurzanFrontlineWidget'
import { TextWidget } from '@/components/widgets/TextWidget'
import {
  applyKurzanFrontlineHarvest,
  resetKurzanFrontlineWithResonancePotion,
  revertKurzanFrontlineHarvest,
} from '@/lib/kurzanFrontline'
import { mockCharacter } from '@/mocks/character'
import { mockGuardian } from '@/mocks/guardian'
import { mockKurzanFrontline } from '@/mocks/kurzanFrontline'

function App() {
  const [isDark, setIsDark] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [guardian, setGuardian] = useState(mockGuardian)
  const [kurzanFrontline, setKurzanFrontline] = useState(mockKurzanFrontline)
  const [isKurzanSettingsOpen, setIsKurzanSettingsOpen] = useState(false)
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const handleRefresh = () => {
    setIsRefreshing(true)
    window.setTimeout(() => setIsRefreshing(false), 1200)
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-background p-8 text-foreground">
      <div className="flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-lg font-semibold">Character Banner</h1>
        <Button variant="outline" size="icon" onClick={() => setIsDark((v) => !v)}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="w-full max-w-4xl">
        <CharacterBanner
          character={mockCharacter}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="w-full max-w-4xl">
        <CharacterBannerCompact
          character={mockCharacter}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="w-full max-w-4xl">
        <h1 className="mb-4 text-lg font-semibold">Guardian</h1>
        <GuardianWidget
          data={guardian}
          className="max-w-sm"
          onToggleHarvested={(checked) => setGuardian((prev) => ({ ...prev, isHarvested: checked }))}
        />
      </div>

      <div className="w-full max-w-4xl">
        <h1 className="mb-4 text-lg font-semibold">Kurzan Frontline</h1>
        <KurzanFrontlineWidget
          data={kurzanFrontline}
          className="max-w-sm"
          onToggleHarvested={(checked) =>
            setKurzanFrontline((prev) =>
              checked ? applyKurzanFrontlineHarvest(prev) : revertKurzanFrontlineHarvest(prev),
            )
          }
          onUseResonancePotion={() =>
            setKurzanFrontline((prev) => resetKurzanFrontlineWithResonancePotion(prev))
          }
          onOpenSettings={() => setIsKurzanSettingsOpen(true)}
        />
        <KurzanFrontlineSettingsModal
          open={isKurzanSettingsOpen}
          onClose={() => setIsKurzanSettingsOpen(false)}
          characterName={mockCharacter.characterName}
          data={kurzanFrontline}
          onSave={setKurzanFrontline}
        />
      </div>

      <div className="w-full max-w-4xl">
        <h1 className="mb-4 text-lg font-semibold">Text</h1>
        <TextWidget value={textValue} onChange={setTextValue} className="max-w-sm" />
      </div>

      <div className="flex w-full flex-col gap-4">
        <h1 className="text-lg font-semibold">Widget Grid — Drag &amp; Drop</h1>
        <div className="flex flex-wrap gap-6">
          <WidgetDashboard />
          <WidgetDashboard />
          <WidgetDashboard />
        </div>
      </div>
    </div>
  )
}

export default App
