import * as Vue from 'vue'

// Every PrimeVue components
const primevueGlob = import.meta.glob( '/node_modules/primevue/*/index.mjs',{ eager: true })
// Own Components
const componentGlob = import.meta.glob('/src/components/**/*.vue', { eager: true })

// Build the module cache for the runtime compiler to resolve imports
export function buildModuleCache(): Record<string, any> {
    
    // Cache for modules that can be imported by name
    const cache: Record<string, any> = {
        vue: Vue,
    }

    // --- PrimeVue: '/node_modules/primevue/button/index.mjs' -> 'primevue/button' ---
    for (const [path, mod] of Object.entries(primevueGlob)) {
        const name = path.match(/primevue\/([^/]+)\//)?.[1]
        if (!name) continue
        const def = (mod as any).default
        if (!def) continue   // skip non-component entries
        cache[`primevue/${name}`] = { default: def, __esModule: true }
    }

    // --- Own components: expose under both '@/components/...' and '/src/components/...' ---
    for (const [path, mod] of Object.entries(componentGlob)) {
        cache[path.replace(/^\/src\//, '@/')] = mod  // '@/components/Foo.vue'
        cache[path] = mod                            // '/src/components/Foo.vue'
    }

    return cache
}