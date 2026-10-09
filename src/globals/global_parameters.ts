import { ref } from 'vue';
import { type GlobalParameter, getGlobalParameters } from "@/services/global_parameter_service"

// globale reactive variable
export const globalParameters = ref<GlobalParameter[]>([]);

export async function fetchGlobalParameter() {
    await getGlobalParameters().then(response => {
        globalParameters.value = response.data;
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
}

