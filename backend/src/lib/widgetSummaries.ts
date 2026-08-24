import { ticketCountByType } from './ebonyCubeCatalog.js'

interface EbonyCubeState {
  selectedTicketType: string | null
  ticketCountUnlock1: number
  ticketCountUnlock2: number
  ticketCountUnlock3: number
  ticketCountUnlock4: number
}

export function toEbonyCubeSummary(state: EbonyCubeState) {
  return {
    selectedTicketType: state.selectedTicketType,
    tickets: ticketCountByType(state),
  }
}

interface HalHourglassState {
  level: string
  sandStack: number
  isCompleted: boolean
}

export function toHalHourglassSummary(state: HalHourglassState) {
  return {
    level: state.level,
    sandStack: state.sandStack,
    isCompleted: state.isCompleted,
  }
}
