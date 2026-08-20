import * as Vue from 'vue'
import Button from 'primevue/button'          // default import — the component itself
import InputText from 'primevue/inputtext'
import Card from 'primevue/card'

const componentGlob = import.meta.glob('@/components/**/*.vue', { eager: true })

export function buildModuleCache(): Record<string, any> {
    const cache: Record<string, any> = {
        vue: Vue,
        'primevue/button': { default: Button, __esModule: true },
        'primevue/inputtext': { default: InputText, __esModule: true },
        'primevue/card': { default: Card, __esModule: true },
    }

    for (const [path, mod] of Object.entries(componentGlob)) {
        cache[path.replace(/^\/src\//, '@/')] = mod
    }
    return cache
}