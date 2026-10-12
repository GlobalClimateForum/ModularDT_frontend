<script lang="ts" setup>
// Vue stuff
import { ref, onMounted, onUnmounted, computed } from 'vue'
import DataTable from 'primevue/datatable';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import { useConfirm } from "primevue/useconfirm";
import { useI18n } from 'vue-i18n';
import MultiSelect from 'primevue/multiselect';
import { useToast } from 'primevue/usetoast'
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
// globals and services
import { type ParameterChange } from '@/services/parameterstore_service'
import parameterStore from '@/services/parameterstore_service'
import { slideParameters, fetchSlideParameters } from '@/globals/slide_parameters';
import { globalParameters, fetchGlobalParameter } from '@/globals/global_parameters';
import { useWhatYouSeeOnMonitors } from '@/globals/live_presentation';
import { deleteGlobalParameter, deleteGlobalParameters, saveGlobalParameter, type GlobalParameter } from '@/services/global_parameter_service'
import { useItemDeletion } from '@/generics/deleteItem'
// components
import LiveParametersGlobal from '@/components/LiveParametersGlobal.vue';


const { onConfirmDeleteItem } = useItemDeletion();
const { t } = useI18n();
const confirm = useConfirm();
const toast = useToast();

const parameterChanges = ref<ParameterChange[]>([])
const addParameterActive = ref<Boolean>(false)
const parameterName = ref<string>("");
const autoConnection = ref<Boolean>(false);
const selectedParameterType = ref<string | null>(null);

let whatYouSeeOnMonitors = useWhatYouSeeOnMonitors()


const parameterTypeOptions = ref<{ label: string; value: string }[]>([
    { label: 'Boolean', value: 'Boolean' },
    { label: 'Number', value: 'Number' },
    { label: 'String', value: 'String' },
    { label: 'Selection', value: 'Selection' }
]);

const parameterValueOption = ref<string>("");
const parameterValueOptions = ref<string[]>([]);

const selectedSlideParameters = ref<number[]>([]);
const slideParameterArray = ref<{ label: string; value: number }[]>([]);

const selectedGlobalParameter = ref<GlobalParameter | null>(null);
const editingRows = ref<GlobalParameter[]>([]);
</script>

<template>
    <div class="dashboard">
        <Tabs value="0" scrollable class="flexbox">
            <TabList>
                <Tab value="global_parameters">Global</Tab>
                <Tab v-for="(slot, index) in whatYouSeeOnMonitors" :key="'monitor' + (index + 1)"
                    :value="'monitor' + (index + 1)">Monitor {{ (index + 1) }}</Tab>
            </TabList>
            <TabPanels class="dashboard">
                <TabPanel value="global_parameters" style="width: 100%; min-width: 0;">
                    <LiveParametersGlobal/>
                </TabPanel>
                <TabPanel v-for="(slot, index) in whatYouSeeOnMonitors" :key="'monitor' + (index + 1)"
                    :value="'monitor' + (index + 1)">
                    <h2 class="text-lg font-bold">Tab for Monitor {{ index + 1 }}</h2>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>


<style scoped>
.header-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-medium);
    min-width:0; 
}

.header-row h1 {
    margin: 0;
}

.header-row-actions {
    display: flex;
    /*align-items: center;*/
    gap: var(--space-medium);
}

.label-container {
    width: 100%;
}

.parameter-change-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    overflow-y: auto;
}


.scrollable-table {
    /*overflow: auto;*/
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
}

.panel-content {
    height: 100%;
    min-height: 0;
    padding: var(--space-small) var(--space-medium) var(--space-medium);
    gap: var(--space-medium);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    align-items: stretch; 
}

</style>