import { reactive, readonly } from 'vue'
import wsService from '@/services/websocket_service'

export interface ParameterChange {
    section: number // Section ID of the targeted section
    parameter: string // Name of the parameter that should be changed
    value: any // New value for the parameter
}


class ParameterStore {

    private state = reactive<Record<string, any>>({})
    private listeners = new Set<(change: ParameterChange) => void>()
    private applyingRemote = false

    private channelId = `parameters/`
    private wsUrlParameter = new URL('/ws/parameters/', import.meta.env.VITE_API_BASE_URL)
    // private socketUrl = this.wsUrlParameter.toString()
    // Fix: socketURL is now set in the constructor to ensure the protocal is correct before
    // the WebSocket connection is established, in the old version it was set to http or https,
    // which caused issues with the WebSocket connection. Now it is set to ws or wss based on the protocol of the page.
    private socketUrl = ''


    handleMessage = (data: ParameterChange) => {
        if (data?.section == null || data?.parameter == null) return
        this.applyingRemote = true
        this.set(data)          // applies + notifies; won't re-broadcast because of the guard in set()
        this.applyingRemote = false
    }

    constructor() {
        this.wsUrlParameter.protocol = this.wsUrlParameter.protocol === 'https:' ? 'wss:' : 'ws:'
        this.socketUrl = this.wsUrlParameter.toString() // ensure the protocol is correct before connecting
        wsService.connect(this.channelId, this.socketUrl)
        wsService.on(this.channelId, 'message', this.handleMessage)
    }


    private getKey(section: number, parameter: string) {
        return `${section}:${parameter}`
    }


    public set(change: ParameterChange) {
        // Update own parameter state
        this.state[this.getKey(change.section, change.parameter)] = change.value
        // Notify all listeners of the change
        this.listeners.forEach(fn => fn(change))
        // Broadcast the change to the server if it was not applied from a remote source
        // (i.e., if it was a local change). Before  achange updated the local client but never
        // went out to the server, so other clients (Tabs) never saw it. We send the plain change
        // object here as the JSONG.stringify is handled by websocket_service.ts
        //  Skip sending if we are applying a remote change to avoid recursive update loops
        if (!this.applyingRemote) wsService.send(this.channelId, change)
    }

    public get(section: number, parameter: string) {
        return this.state[this.getKey(section, parameter)]
    }

    public subscribe(fn: (change: ParameterChange) => void) {
        this.listeners.add(fn)
        return () => this.listeners.delete(fn)
    }

    public getStoreState() {
        return readonly(this.state)
    }

    public destroy() {
        wsService.off(this.channelId, 'message', this.handleMessage)
        wsService.disconnect(this.channelId)
    }
}

export default new ParameterStore()


/*
const state = reactive<Record<string, any>>({})
const listeners = new Set<(change: ParameterChange) => void>()

function key(section: number, parameter: string) {
    return `${section}:${parameter}`
}

let applyingRemote = false

const parameterStore = {
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

export default parameterStore
*/

/*
    public subscribe(fn: (change: ParameterChange) => void) {
        this.listeners.add(fn)
        // We wrap the listener to handle the WebSocket sync logic internally        
        const wrappedListener = (change: ParameterChange) => {
            if (this.applyingRemote) return
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(change))
            }
            fn(change)
        }
        // To keep the logic consistent with your original code where the         
        // // subscription itself triggers the WS send:        
        this.listeners.delete(fn)
        this.listeners.add(wrappedListener)
        return () => this.listeners.delete(wrappedListener)
    }
*/
