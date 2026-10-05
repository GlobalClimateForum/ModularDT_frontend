import { reactive, readonly } from 'vue'
import { useWebsocketService } from '@/services/websocket_service'

export interface ParameterChange {
    section: number
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
    const wsUrlParameter = new URL('/ws/parameters/', import.meta.env.VITE_API_BASE_URL)
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
    
    const destroy = () => {
        wsService.off(channelId, 'message', handleMessage)
        wsService.disconnect(channelId)
    }
    
    // Initialize
    wsService.connect(channelId, socketUrl)
    wsService.on(channelId, 'message', handleMessage)
    
    return {
        state: getStoreState(),
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
