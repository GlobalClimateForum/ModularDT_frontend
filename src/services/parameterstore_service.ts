import { reactive, readonly, watch } from 'vue'
import { useWebsocketService } from '@/services/websocket_service'
import { API_BASE_URL } from '@/config'
import { computed } from 'vue'
import { useToast } from 'primevue/usetoast';

// ----------------- Parameter Types -----------------

export type ParamMap = Record<string, ParameterChange>

export interface ParameterJSON {
    global: ParamMap
    participants: Record<string, ParamMap>
    sections: Record<number, ParamMap>
}

export const ptypes = ['number', 'boolean', 'select', 'string'] as const
export type ParameterType = typeof ptypes[number]



export interface ParameterChange {
    section: number | number[] | "global" | "participant",
    participantSeat?: number,
    participantName?: string,
    parameter: string
    value: any
}

export interface ParameterDefinition {
    id: number
    type: ParameterType
    description: string
    range: { min: number | null; max: number | null } | null
    default: string | number | boolean
    options: string[]
}

export type ParameterDefinitionMap = Record<string, ParameterDefinition>




// ----------------- Parameter Store -----------------

function createParameterStore() {
    const wsService = useWebsocketService()

    // Private state
    const state = reactive<Record<string, any>>({})
    const listeners = new Set<(change: ParameterChange) => void>()
    let applyingRemote = false
    let dirty = false // Tracks if there are unsaved changes to the parameter store
    let sendTimer: ReturnType<typeof setTimeout> | undefined    // Timer for batching parameter changes to send to the server

    // Setup
    const channelId = 'parameters/'
    const wsUrlParameter = new URL('/ws/parameters/', API_BASE_URL)
    wsUrlParameter.protocol = wsUrlParameter.protocol === 'https:' ? 'wss:' : 'ws:'
    const socketUrl = wsUrlParameter.toString()

    // Snapshot Channel
    const stateChannel = 'parameter-state/'
    const wsUrlState = new URL('/ws/parameter-state/', API_BASE_URL)
    wsUrlState.protocol = wsUrlState.protocol === 'https:' ? 'wss:' : 'ws:'
    const stateSocketUrl = wsUrlState.toString()

    // Private helpers
    const getKey = (c: Pick<ParameterChange, 'section' | 'parameter' | 'participantSeat'>) =>
        c.section === 'participant'
            ? `participant:${c.participantSeat}:${c.parameter}`
            : `${c.section}:${c.parameter}`

    const handleMessage = (data: ParameterChange) => {
        if (data?.section == null || data?.parameter == null) return
        applyingRemote = true
        try {                                                   // CHANGED: try/finally
            set(data)
        } finally {
            applyingRemote = false
        }
    }

    // Public methods
    const set = (change: ParameterChange) => {
        const c = { ...change }
        state[getKey(c)] = c
        listeners.forEach(fn => fn(c))
        if (!applyingRemote) {
            wsService.send(channelId, c)
            dirty = true  // There are unsynced changes after a local change
        }
    }

    const get = (section: ParameterChange['section'], parameter: string, participantSeat?: number) => {
        return state[getKey({ section, parameter, participantSeat })]
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

    const empty = () => {
        for (const key of Object.keys(state)) delete state[key]
        dirty = true  // so the watcher pushes the empty snapshot to all clients
        console.log("Parameter store flushed");
    }

    const asJSONString = computed(() => JSON.stringify(asJSON.value, null, 2))

    // Hydrate = Load the parameter store from a snapshot
    const hydrate = (snap: ParameterJSON) => {
        applyingRemote = true
        try {
            Object.values(snap.global ?? {}).forEach(set)
            Object.values(snap.participants ?? {}).forEach(m => Object.values(m).forEach(set))
            Object.values(snap.sections ?? {}).forEach(m => Object.values(m).forEach(set))
        } finally {
            applyingRemote = false
        }
    }

    // handle state messages from the server (snapshot updates)
    const handleStateMessage = (msg: { type?: string; data?: ParameterJSON }) => {
        if (msg?.type === 'snapshot' && msg.data) hydrate(msg.data)
    }


    // Stream the parameter state from the server
    const stopWatch = watch(asJSON, (snap) => {
        if (!dirty) return
        clearTimeout(sendTimer)
        sendTimer = setTimeout(() => {
            wsService.send(stateChannel, { type: 'snapshot', data: snap })
            dirty = false
        }, 200)
    })

    const destroy = () => {
        clearTimeout(sendTimer)
        stopWatch()
        wsService.off(channelId, 'message', handleMessage)
        wsService.disconnect(channelId)
    }

    // Initialize
    wsService.connect(channelId, socketUrl)
    wsService.on(channelId, 'message', handleMessage)
    wsService.connect(stateChannel, stateSocketUrl)
    wsService.on(stateChannel, 'message', handleStateMessage)

    return {
        state: getStoreState(),
        asJSON,
        asJSONString,
        empty,
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
