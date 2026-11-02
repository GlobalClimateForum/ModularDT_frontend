import { reactive, readonly } from 'vue'
import { useWebsocketService } from '@/services/websocket_service'
import { API_BASE_URL } from '@/config'
import { computed } from 'vue'
import { getCurrentParticipantParametersAsJSON } from '@/globals/participant_parameters'
import { participants } from '@/globals/participants'

export interface ParameterChange {
    section: number | number[] | "global" | "participant",
    seat?: number
    parameter: string
    value: any
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
    const getKey = (section: number, parameter: string) => `${section}:${parameter}`

    const handleMessage = (data: ParameterChange) => {
        if (data?.section == null || data?.parameter == null) return
        applyingRemote = true
        set(data)
        applyingRemote = false
    }

    // Public methods
    const set = (change: ParameterChange) => {
        state[getKey(change.section, change.parameter)] = change.value
        listeners.forEach(fn => fn(change))
        if (!applyingRemote) wsService.send(channelId, change)
    }

    const get = (section: number, parameter: string) => {
        return state[getKey(section, parameter)]
    }

    const subscribe = (fn: (change: ParameterChange) => void) => {
        listeners.add(fn)
        return () => listeners.delete(fn)
    }

    const getStoreState = () => readonly(state)

    const stateJson = computed(() => {

        let globals = {}
        let sectionspecific = {}
        let participantsspecific = {}

        Object.keys(state).forEach(key => {
            const [section, parameter] = key.split(':')

            if (section === 'global') {
                globals[parameter] = state[key]
            }

            if (section !== 'global') {
                sectionspecific[section] =  { [parameter]: state[key] }
            }
        })

        return JSON.stringify(
            {
                global: globals,
                sectionspecific: sectionspecific,
                participants : getCurrentParticipantParametersAsJSON()
            }
        )
    }

    )

    const destroy = () => {
        wsService.off(channelId, 'message', handleMessage)
        wsService.disconnect(channelId)
    }

    // Initialize
    wsService.connect(channelId, socketUrl)
    wsService.on(channelId, 'message', handleMessage)

    return {
        state: getStoreState(),
        stateJson,
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
