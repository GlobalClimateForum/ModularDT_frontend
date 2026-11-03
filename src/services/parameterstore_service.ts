import { reactive, readonly } from 'vue'
import { useWebsocketService } from '@/services/websocket_service'
import { API_BASE_URL } from '@/config'
import { computed } from 'vue'

export interface ParameterChange {
    section: number | number[] | "global" | "participant",
    participantSeat?: number,
    participantName?: string,
    parameter: string
    value: any
}

type ParamMap = Record<string, ParameterChange>

interface ParameterJSON {
    global: ParamMap
    participants: Record<string, ParamMap>
    sections: Record<number, ParamMap>
}

function createParameterStore() {
    const wsService = useWebsocketService()

    // Private state
    const state = reactive<Record<string, any>>({})
    const listeners = new Set<(change: ParameterChange) => void>()
    let applyingRemote = false

    // Setup
    const channelId = 'parameters/'
    const wsUrlParameter = new URL('/ws/parameters/', API_BASE_URL)
    wsUrlParameter.protocol = wsUrlParameter.protocol === 'https:' ? 'wss:' : 'ws:'
    const socketUrl = wsUrlParameter.toString()

    // Private helpers
    const getKey = (c: Pick<ParameterChange, 'section' | 'parameter' | 'participantSeat'>) =>
        c.section === 'participant'
            ? `participant:${c.participantSeat}:${c.parameter}`
            : `${c.section}:${c.parameter}`

    const handleMessage = (data: ParameterChange) => {
        if (data?.section == null || data?.parameter == null) return
        applyingRemote = true
        set(data)
        applyingRemote = false
    }

    // Public methods
    const set = (change: ParameterChange) => {
        const c = { ...change }
        state[getKey(c)] = c
        listeners.forEach(fn => fn(c))
        if (!applyingRemote) wsService.send(channelId, c)
    }
    const get = (section: number, parameter: string) => {
        return state[getKey(section, parameter)]
    }

    const subscribe = (fn: (change: ParameterChange) => void) => {
        listeners.add(fn)
        return () => listeners.delete(fn)
    }

    const getStoreState = () => readonly(state)

    const asJSON = computed<ParameterJSON>(() => {
        const result: ParameterJSON = {
            global: {},
            participants: {},
            sections: {}
        }

        for (const change of Object.values(state)) {
            const s = change.section
            if (s === 'global') {
                result.global[change.parameter] = change
            } else if (s === 'participant') {
                const name = change.participantName ?? String(change.participantSeat)
                    ; (result.participants[name] ??= {})[change.parameter] = change
            } else {
                const ids = Array.isArray(s) ? s : [s]
                for (const id of ids) {
                    (result.sections[id] ??= {})[change.parameter] = change
                }
            }
        }
        return result
    })

    const asJSONString = computed(() => JSON.stringify(asJSON.value, null, 2))

    const destroy = () => {
        wsService.off(channelId, 'message', handleMessage)
        wsService.disconnect(channelId)
    }

    // Initialize
    wsService.connect(channelId, socketUrl)
    wsService.on(channelId, 'message', handleMessage)

    return {
        state: getStoreState(),
        asJSON,
        asJSONString,
        set,
        get,
        subscribe,
        destroy
    }
}

// Singleton wrapper
let instance: ReturnType<typeof createParameterStore> | null = null

export function useParameterStore() {
    if (!instance) {
        instance = createParameterStore()
    }
    return instance
}

// For backward compatibility with default export
export default useParameterStore()

// Small utility function to check if a parameter change affects a given section
export function hit(sectionID: number, parameterChange: ParameterChange) {
    const s = parameterChange.section
    return s === "global" || s === sectionID || (Array.isArray(s) && s.includes(sectionID))
}
