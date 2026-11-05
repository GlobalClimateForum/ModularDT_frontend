<script lang="ts" setup>
import { computed } from 'vue'
import type { Parameters } from '@/services/slide_service'

const props = withDefaults(defineProps<{
    parameters?: Parameters | null
    title?: string
    emptyText?: string
    maxHeight?: string
}>(), {
    parameters: () => ({}),
    title: 'Current Parameters',
    emptyText: 'No parameters defined',
    maxHeight: '300px',
})

const entries = computed(() => Object.entries(props.parameters ?? {}))

const formatValue = (v: unknown) =>
    v === null || v === undefined || v === '' ? '—' : String(v)

const hasExtra = (param: any) =>
    (param.type === 'number' && param.range) ||
    (param.type === 'select' && param.options?.length) ||
    param.description
</script>

<template>
    <div class="param-section">

        <label v-if="title">{{ title }}</label>

        <div v-if="entries.length" class="param-list" :style="{ maxHeight }">
            <div v-for="[name, param] in entries" :key="name" class="param-row">

                <div class="param-main">
                    <span class="param-name" :title="name">{{ name }}</span>
                    <span class="param-type">{{ param.type }}</span>
                    <span v-if="param.type !== 'select'" class="param-default" :title="formatValue(param.default)">
                        {{ formatValue(param.default) }}
                    </span>
                </div>

                <span v-if="param.description" class="param-description">{{ param.description }}</span>

                <div v-if="hasExtra(param)" class="param-extra">
                    <span v-if="param.type === 'number' && param.range">
                        {{ formatValue(param.range.min) }} … {{ formatValue(param.range.max) }}
                        <template v-if="param.range.step"> · step {{ param.range.step }}</template>
                    </span>

                    <span v-if="param.type === 'select' && param.options?.length" class="option-chips">
                        <span v-for="opt in param.options" :key="opt" class="option-chip"
                            :class="{ 'is-default': opt === param.default }">{{ opt }}</span>
                    </span>


                </div>
            </div>
        </div>

        <div v-else class="param-empty">{{ emptyText }}</div>
    </div>
</template>

<style scoped>
.param-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    width: 100%;
    margin-top: var(--space-medium);
}

.param-list {
    width: 100%;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    overflow-y: auto;
}

.param-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: var(--space-medium);
}

.param-row+.param-row {
    border-top: 1px solid var(--p-primary-100);
}

.param-main {
    display: flex;
    align-items: baseline;
    gap: var(--space-small);
    min-width: 0;
}

.param-name {
    font-family: "Fira Code";
    font-size: var(--fs-medium);
    font-weight: 700;
    color: var(--p-primary-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.param-type {
    flex: none;
    font-family: "Fira Code";
    font-size: 0.8rem;
    padding: 1px 6px;
    border-radius: var(--br-small);
    background-color: var(--p-surface-100);
    color: var(--p-surface-500);
}

.param-default {
    margin-left: auto;
    flex: none;
    max-width: 40%;
    font-family: "Fira Code";
    font-size: var(--fs-medium);
    color: var(--p-primary-600);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.param-extra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.875rem;
}

.option-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.option-chip {
    padding: 2px 8px;
    border: 1px solid var(--p-surface-200);
    border-radius: var(--br-small);
    color: var(--p-surface-600);
}

.option-chip.is-default {
    border-color: var(--p-primary-400);
    background: var(--p-primary-50);
    color: var(--p-primary-600);
    font-weight: 600;
}

.param-description {
    width: 100%;
    margin-top: 2px;
    font-style: italic;
    color: var(--p-surface-500);
    margin-bottom: var(--space-small);
}

.param-empty {
    font-size: var(--fs-small);
    opacity: 0.6;
    font-style: italic;
}
</style>