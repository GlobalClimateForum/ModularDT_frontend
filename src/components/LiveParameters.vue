<script lang="ts" setup>
// Vue stuff
import { useI18n } from 'vue-i18n';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
// globals and services
import { useWhatYouSeeOnMonitors } from '@/globals/live_presentation';
// components
import LiveParametersGlobal from '@/components/LiveParametersGlobal.vue';

const { t } = useI18n();
let whatYouSeeOnMonitors = useWhatYouSeeOnMonitors()
</script>

<template>
    <div class="dashboard">
        <Tabs value="0" scrollable class="flexbox">
            <TabList>
                <Tab value="global_parameters">{{ $t('moderator.parameters.global') }}</Tab>
                <Tab v-for="(slot, index) in whatYouSeeOnMonitors" :key="'monitor' + (index + 1)"
                    :value="'monitor' + (index + 1)">{{ $t('monitor.name') }} {{ (index + 1) }}</Tab>
            </TabList>
            <TabPanels class="dashboard">
                <TabPanel value="global_parameters" style="width: 100%; min-width: 0;">
                    <LiveParametersGlobal/>
                </TabPanel>
                <TabPanel v-for="(slot, index) in whatYouSeeOnMonitors" :key="'monitor' + (index + 1)"
                    :value="'monitor' + (index + 1)">
                    <!--<h2 class="text-lg font-bold">Tab for Monitor {{ index + 1 }}</h2>-->
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>


<style scoped>

</style>