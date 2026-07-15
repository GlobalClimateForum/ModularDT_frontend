import { reactive, readonly } from 'vue'

export interface ParameterChange {
    section: number
    parameter: string
    value: any
}

const state = reactive<Record<string, any>>({})
const listeners = new Set<(change: ParameterChange) => void>()

function key(section: number, parameter: string) {
    return `${section}:${parameter}`
}

let applyingRemote = false

export const parameterStore = {
    state: readonly(state),

    set(change: ParameterChange) {
        state[key(change.section, change.parameter)] = change.value
        listeners.forEach(fn => fn(change))
    },

    get(section: number, parameter: string) {
        return state[key(section, parameter)]
    },

    subscribe(fn: (change: ParameterChange) => void) {
        listeners.add(fn)
        return () => listeners.delete(fn)
    },
}

// --- websocket wiring ---
const wsUrl = new URL('/ws/parameters/', import.meta.env.VITE_API_BASE_URL)
wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'
const ws = new WebSocket(wsUrl.toString())

ws.onopen = () => console.log('WS open')
ws.onerror = (e) => console.error('WS error', e)
ws.onclose = (e) => console.log('WS closed', e.code)

ws.onmessage = (e) => {
    const change = JSON.parse(e.data)
    applyingRemote = true
    parameterStore.set(change)
    applyingRemote = false
}

parameterStore.subscribe((change) => {
    if (applyingRemote) return
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(change))
    }
})