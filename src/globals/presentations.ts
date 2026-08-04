import { ref } from 'vue';
import type { Presentation } from "@/services/presentation_service"
import { getPresentations } from "@/services/presentation_service";

// globale reactive variable
export const presentations = ref<Presentation[]>([]);

export function fetchPresentations() {
    getPresentations().then(response => {
        presentations.value = response.data.presentations;
        console.info('fetched presentations:', JSON.parse(JSON.stringify(presentations.value)))
    }).catch(error => {
        console.error("Error fetching presentations:", error);
    });
}