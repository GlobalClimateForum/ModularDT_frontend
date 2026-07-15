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

export const parameterStore = {
    state: readonly(state),

    set(change: ParameterChange) {
        console.log('parameterStore.set', change)
        state[key(change.section, change.parameter)] = change.value
        listeners.forEach(fn => fn(change))
    },

    get(section: number, parameter: string) {
        return state[key(section, parameter)]
    },

    // subscribe to any parameter change; returns an unsubscribe fn
    subscribe(fn: (change: ParameterChange) => void) {
        listeners.add(fn)
        return () => listeners.delete(fn)
    },
}