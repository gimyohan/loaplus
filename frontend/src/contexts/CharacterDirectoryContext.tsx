import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { deleteCharacter, fetchCharacters, refreshCharacter, registerCharacter } from '@/lib/characters'
import type { CharacterSummary } from '@/types/character'

interface CharacterDirectoryValue {
  characters: CharacterSummary[]
  isLoading: boolean
  findByName: (characterName: string) => CharacterSummary | undefined
  /** 이미 등록된 이름이면 그 캐릭터를 반환하고, 아니면 Open API로 조회해 새로 등록한다. */
  resolveByName: (characterName: string) => Promise<CharacterSummary>
  remove: (characterId: string) => Promise<void>
  /** Open API를 재호출해 저장된 정보를 최신화한다(배너 '새로고침'). */
  refresh: (characterId: string) => Promise<CharacterSummary>
}

const CharacterDirectoryContext = createContext<CharacterDirectoryValue | null>(null)

export function CharacterDirectoryProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') {
      setCharacters([])
      setIsLoading(status === 'loading')
      return
    }

    let cancelled = false
    setIsLoading(true)
    fetchCharacters()
      .then((data) => {
        if (!cancelled) setCharacters(data)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status])

  const findByName = useCallback(
    (characterName: string) => characters.find((c) => c.characterName === characterName),
    [characters],
  )

  const resolveByName = useCallback(
    async (characterName: string) => {
      const existing = characters.find((c) => c.characterName === characterName)
      if (existing) return existing

      const character = await registerCharacter(characterName)
      setCharacters((prev) => [...prev, character])
      return character
    },
    [characters],
  )

  const remove = useCallback(
    async (characterId: string) => {
      const prev = characters
      setCharacters((cur) => cur.filter((c) => c.id !== characterId))
      try {
        await deleteCharacter(characterId)
      } catch (err) {
        setCharacters(prev)
        throw err
      }
    },
    [characters],
  )

  const refresh = useCallback(async (characterId: string) => {
    const updated = await refreshCharacter(characterId)
    setCharacters((prev) => prev.map((c) => (c.id === characterId ? updated : c)))
    return updated
  }, [])

  const value = useMemo(
    () => ({ characters, isLoading, findByName, resolveByName, remove, refresh }),
    [characters, isLoading, findByName, resolveByName, remove, refresh],
  )

  return <CharacterDirectoryContext.Provider value={value}>{children}</CharacterDirectoryContext.Provider>
}

export function useCharacterDirectory() {
  const ctx = useContext(CharacterDirectoryContext)
  if (!ctx) throw new Error('useCharacterDirectory must be used within a CharacterDirectoryProvider')
  return ctx
}
