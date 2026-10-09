import { ref } from 'vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/';

export const backendServerStatusClass = ref<'success' | 'error' | 'warn'>('warn')

export async function getBackendServerStatus(): Promise<{ message: string }> {
    if (!API_BASE_URL) {
        backendServerStatusClass.value = 'error'
        return { message: 'VITE_API_BASE_URL not configured' }
    }
    try {
        const res = await fetch(`${API_BASE_URL}health`, { method: 'GET' })
        if (res.ok) {
            backendServerStatusClass.value = 'success'
            return { message: 'Connected' }
        }
        backendServerStatusClass.value = 'error'
        return { message: `Error: ${res.status} ${res.statusText}` }
    } catch (e) {
        backendServerStatusClass.value = 'error'
        return { message: e instanceof Error ? e.message : 'Unreachable' }
    }
}

export const backendServerUrl = API_BASE_URL ?? ''