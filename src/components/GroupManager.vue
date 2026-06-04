<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

interface Group {
  id: number;
  name: string;
}

const props = defineProps<{
  groups: Group[];
}>();
</script>

<template>
  <DataTable :value="props.groups">
    <Column field="id" header="ID" />
    <Column field="name" header="Name" />
  </DataTable>
</template>

<style scoped></style>