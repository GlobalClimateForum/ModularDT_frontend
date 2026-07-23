<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import "@/assets/main.css";
import type { Participant } from "@/services/participant_service";

const props = defineProps<{
  participants: Participant[];
}>();

</script>

<template>
  <div class="dashboard participants-container">
    <h1 class="dashboard_label">Participants</h1>
    <DataTable :value="props.participants">
      <Column field="id" header="ID" />
      <Column field="name" header="Name" />
    </DataTable>
  </div>
</template>

<style scoped>
.participants-container {
  display: grid;
  aspect-ratio: var(--grid-aspect);
  width: 100%;
  height: auto;
  max-height: 100%;
  margin: auto;
  gap: var(--space-medium);
  padding: var(--space-medium);
  border-radius: var(--br-medium);
}
</style>