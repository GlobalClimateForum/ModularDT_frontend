<script lang="ts" setup>
// Vue stuff
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
// globals and services

onMounted(() => {
})

const activeTab = ref('global_parameters')

</script>

<template>
    <div class="dashboard">
        <h2>Live poll</h2>
    </div>
</template>


<style scoped>
</style>