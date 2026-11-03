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
import { useWhatYouSeeOnMonitors } from '@/globals/live_presentation';
import { type Slide, getIPSlide } from '@/services/slide_service';
import { getSlideById } from '@/globals/slides'
// components
import LiveParametersGlobal from '@/components/LiveParametersGlobal.vue';
import LiveParametersSlide from '@/components/LiveParametersSlide.vue';

//const { t } = useI18n();
let whatYouSeeOnMonitors = useWhatYouSeeOnMonitors()
const IpSlidesForCurrentMonitorSlides = ref<(Slide | null)[]>([]);

async function getIPSlideFromID(id: number) {
  let response = await getIPSlide(id)
  //console.log("response: ", response)
  return response.data.length==0 ? null : Number(response.data[0].slide_id)
}

async function getIPSlides() {
  try {
    const results = await Promise.all(
      whatYouSeeOnMonitors.value.map(async item => {
        if (item?.id == null) return null
        const slideId = await getIPSlideFromID(item.id)
        return slideId == null ? null : (getSlideById(slideId) ?? null)
      })
    )
    //console.log("results: ", results)
    IpSlidesForCurrentMonitorSlides.value = results
    console.log("IpSlidesForCurrentMonitorSlides: ", IpSlidesForCurrentMonitorSlides.value)
  } catch (error) {
    console.error('Error filling A:', error)
  }
}

onMounted(() => {
  getIPSlides()
})

const activeTab = ref('global_parameters')

</script>

<template>
    <div class="dashboard">
        <Tabs v-model:value="activeTab" scrollable class="flexbox">
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
                    <!-- <h2 class="text-lg font-bold">Tab for Monitor {{ index + 1 }}</h2> -->
                    <LiveParametersSlide :slide="IpSlidesForCurrentMonitorSlides[index]" :sections="IpSlidesForCurrentMonitorSlides[index]?.sections ?? []"/>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>


<style scoped>
:deep(.p-tabpanel) { /* Falls du PrimeVue nutzt, ansonsten die entsprechende Klasse des TabPanels wählen */
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    width: 100%;
}
</style>