import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CharacterBanner } from '@/components/character/CharacterBanner'
import { CharacterBannerCompact } from '@/components/character/CharacterBannerCompact'
import { WidgetDashboard } from '@/components/dashboard/WidgetDashboard'
import { GuardianSettingsModal } from '@/components/widgets/GuardianSettingsModal'
import { GuardianWidget } from '@/components/widgets/GuardianWidget'
import { KurzanFrontlineSettingsModal } from '@/components/widgets/KurzanFrontlineSettingsModal'
import { KurzanFrontlineWidget } from '@/components/widgets/KurzanFrontlineWidget'
import { ParadiseSettingsModal } from '@/components/widgets/ParadiseSettingsModal'
import { ParadiseWidget } from '@/components/widgets/ParadiseWidget'
import { TextWidget } from '@/components/widgets/TextWidget'
import { applyGuardianHarvest, revertGuardianHarvest } from '@/lib/guardian'
import {
  applyKurzanFrontlineHarvest,
  resetKurzanFrontlineWithResonancePotion,
  revertKurzanFrontlineHarvest,
} from '@/lib/kurzanFrontline'
import { decrementParadiseKey, decrementParadiseTicket } from '@/lib/paradise'
import { mockCharacter } from '@/mocks/character'
import { mockGuardian } from '@/mocks/guardian'
import { mockKurzanFrontline } from '@/mocks/kurzanFrontline'
import { mockParadise } from '@/mocks/paradise'

function App() {
  const [isDark, setIsDark] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [guardian, setGuardian] = useState(mockGuardian)
  const [isGuardianSettingsOpen, setIsGuardianSettingsOpen] = useState(false)
  const [kurzanFrontline, setKurzanFrontline] = useState(mockKurzanFrontline)
  const [isKurzanSettingsOpen, setIsKurzanSettingsOpen] = useState(false)
  const [paradise, setParadise] = useState(mockParadise)
  const [isParadiseSettingsOpen, setIsParadiseSettingsOpen] = useState(false)
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
          onToggleHarvested={(checked) =>
            setGuardian((prev) => (checked ? applyGuardianHarvest(prev) : revertGuardianHarvest(prev)))
          }
          onOpenSettings={() => setIsGuardianSettingsOpen(true)}
        />
        <GuardianSettingsModal
          open={isGuardianSettingsOpen}
          onClose={() => setIsGuardianSettingsOpen(false)}
          characterName={mockCharacter.characterName}
          characterItemLevel={mockCharacter.itemLevel}
          data={guardian}
          onSave={setGuardian}
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
        <h1 className="mb-4 text-lg font-semibold">Paradise</h1>
        <ParadiseWidget
          data={paradise}
          className="max-w-sm"
          onDecrementTicket={() => setParadise((prev) => decrementParadiseTicket(prev))}
          onDecrementKey={() => setParadise((prev) => decrementParadiseKey(prev))}
          onOpenSettings={() => setIsParadiseSettingsOpen(true)}
        />
        <ParadiseSettingsModal
          open={isParadiseSettingsOpen}
          onClose={() => setIsParadiseSettingsOpen(false)}
          characterName={mockCharacter.characterName}
          data={paradise}
          onSave={setParadise}
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
