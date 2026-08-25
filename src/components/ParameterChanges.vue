<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Message from 'primevue/message'
import { parameterStore, type ParameterChange } from '@/services/parameter_service'


const parameterChanges = ref<ParameterChange[]>([])

onMounted(() => {
  const stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
  onUnmounted(() => {
    stop()
  })
})


</script>


<template>
    <Splitter :gutter-size="2" class="dashboard">
        <SplitterPanel :size="50" class="sub-panel">
            <h1 class="dashboard_label">Parameter Changes</h1>
            <div style="width: 100%; height: 100%; padding: var(--space-large);" class="inset-control parameter-change-container">
                <div v-for="change in parameterChanges">
                    <Message severity="secondary" size="small">
                        <template #default>
                            <div class="parameter-change">
                                <div class="section-indicator">
                                    {{ change.section }}
                                </div>
                                <ul class="parameter-change-list">
                                    <li><strong>Parameter:</strong> {{ change.parameter }}</li>
                                    <li><strong>Old Value:</strong> {{ change.value }}</li>
                                </ul>
                            </div>
                        </template>
                    </Message>
                </div>
            </div>
        </SplitterPanel>
    </Splitter>
</template>


<style scoped>
.parameter-change-container {
    display: flex; 
    flex-direction: column;
    gap: var(--space-small);
    overflow-y: auto;
}

.parameter-change {
    display: flex;
    flex-direction: row;
    gap: var(--space-medium);
}

.section-indicator {
    font-weight: bold;
    color: var(--p-primary-500);
    width: 50px;
    font-family: "Fira Code", monospace;
    font-size: var(--fs-large); 
    display: flex;
    align-items: center;
    justify-content: center;
}

.parameter-change-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

</style>