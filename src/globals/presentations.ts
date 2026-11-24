import { ref } from 'vue';
import type { Presentation } from "@/services/presentation_service"
import { getPresentations } from "@/services/presentation_service";

// globale reactive variable
export const presentations = ref<Presentation[]>([]);

// Fetch presentations from the backend and update the reactive variable
export function fetchPresentations() {
    return getPresentations().then(response => {
        presentations.value = response.data.presentations;
    }).catch(error => {
        console.error("Error fetching presentations:", error);
    });
}

// Fetch presentations from the backend and update the reactive variable
export async function asyncFetchPresentations() {
    try {
        const response = await getPresentations()
        presentations.value = response.data.presentations;
    } catch (error) {
        console.error("Error asynchronous fetching presentations:", error);
    }
}