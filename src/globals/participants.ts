import { ref } from 'vue';
import type { Participant } from "@/services/participant_service"
import { getParticipants } from "@/services/participant_service";

// globale reactive variable
export const participants = ref<Participant[]>([]);

// Fetch participants from the backend and update the reactive variable
export function fetchParticipants() {
    return getParticipants().then(response => {
        participants.value = response.data.participants;
    }).catch(error => {
        console.error("Error fetching participants:", error);
    });
}

// Fetch participants from the backend and update the reactive variable
export async function asyncFetchParticipants() {
    try {
        const response = await getParticipants()
        participants.value = response.data.participants;
    } catch (error) {
        console.error("Error asynchronous fetching participants:", error);
    }
}