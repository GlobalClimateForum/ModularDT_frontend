<script lang="ts" setup>
import type { SlideSection } from '@/services/slide_service';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useDialog } from 'primevue/usedialog'
import ParameterBuilder from '@/components/ParameterBuilder.vue';
import { computed, watch, ref } from 'vue'
import '@/assets/main.css'

const props = defineProps<{
    slideSection: SlideSection
}>()

const dialog = useDialog();
const contentPath = ref(props.slideSection.content_path ?? '')

const emit = defineEmits<{
    (e: 'sectionUpdated', updatedSection: SlideSection): void;
}>();


function updateContentPath() {
    emit('sectionUpdated', { ...props.slideSection, content_path: contentPath.value.trim() })
}

function openParameterBuilder() {
    dialog.open(ParameterBuilder, {
        props: {
            header: 'Parameter Builder',
            style: { width: '80vw', height: '80vh' },
            maximizable: true,
            modal: true,
        },
        data: {
            section: props.slideSection,
        },
        onClose: (opt) => {
            if (!opt?.data?.saved) return
            emit('sectionUpdated', {
                ...props.slideSection,
                parameters: opt.data.parameters,
            })
        },
    })
}

const parameterEntries = computed(() =>
    Object.entries(props.slideSection.parameters ?? {})
)

const formatValue = (v: unknown) =>
    v === null || v === undefined || v === '' ? '—' : String(v)

const hasExtra = (param: any) =>
    (param.type === 'number' && param.range) ||
    (param.type === 'select' && param.options?.length) ||
    param.description


watch(() => props.slideSection.content_path, p => contentPath.value = p ?? '')

</script>


<template>
    <div class="editor-container">

        <div class="label-container">
            <label>Dynamic Content URL</label>
            <InputText v-model="contentPath" id="title-input" class="url-input" placeholder="endpoint_url"
                @change="updateContentPath()" />
        </div>

        <div class="editor-actions">
            <Button label="Fetch">
                <template #icon>
                    <i class="material-symbols-outlined">download</i>
                </template>
            </Button>
            <Button label="Edit Parameters" @click="openParameterBuilder">
                <template #icon>
                    <i class="material-symbols-outlined">function</i>
                </template>
            </Button>
        </div>

        <!-- MOVED: now inside the single root -->
        <div class="param-section">
            <label>Current Parameters</label>

            <div v-if="parameterEntries.length" class="param-list">
                <div v-for="[name, param] in parameterEntries" :key="name" class="param-row">

                    <div class="param-main">
                        <span class="param-name" :title="name">{{ name }}</span>
                        <span class="param-type">{{ param.type }}</span>
                        <span class="param-default" :title="formatValue(param.default)">
                            {{ formatValue(param.default) }}
                        </span>
                    </div>

                    <div v-if="hasExtra(param)" class="param-extra">
                        <span v-if="param.type === 'number' && param.range">
                            {{ formatValue(param.range.min) }} … {{ formatValue(param.range.max) }}
                            <template v-if="param.range.step"> · step {{ param.range.step }}</template>
                        </span>

                        <span v-if="param.type === 'select' && param.options?.length" class="option-chips">
                            <span v-for="opt in param.options" :key="opt" class="option-chip"
                                :class="{ 'is-default': opt === param.default }">{{ opt }}</span>
                        </span>

                        <span v-if="param.description" class="param-description">{{ param.description }}</span>
                    </div>
                </div>
            </div>

            <div v-else class="param-empty">No parameters defined</div>
        </div>
    </div>
</template>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
}

.url-input {
    width: 100%;
    font-family: "Fira Code";
}

.editor-actions {
    display: flex;
    gap: 0.5rem;
}

/* ---------- Parameter list ---------- */

.param-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    margin-top: var(--space-medium);
}

.param-list {
    width: 100%;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    max-height: 300px;
    overflow-y: auto;
}

.param-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px var(--space-small);
}

.param-row+.param-row {
    border-top: 1px solid var(--p-primary-100);
}

.param-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(60px, 35%);
    align-items: center;
    gap: var(--space-small);
}

.param-name {
    font-family: "Fira Code";
    font-weight: bold;
    color: var(--p-primary-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.param-type {
    font-family: "Fira Code";
    font-size: var(--fs-small);
    padding: 1px 6px;
    border-radius: var(--br-small);
    background-color: var(--p-surface-100);
    color: var(--p-surface-600);
}

.param-default {
    font-family: "Fira Code";
    font-size: var(--fs-small);
    text-align: right;
    color: var(--p-primary-600);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.param-extra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px var(--space-small);
    font-family: "Fira Code";
    font-size: var(--fs-small);
    opacity: 0.75;
}

.option-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.option-chip {
    padding: 0 6px;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-small);
}

.option-chip.is-default {
    border-color: var(--p-primary-500);
    font-weight: bold;
}

.param-description {
    width: 100%;
    font-family: inherit;
    font-style: italic;
}

.param-empty {
    font-size: var(--fs-small);
    opacity: 0.6;
    font-style: italic;
}
</style>