import { ref } from 'vue';
import type { Participant } from "@/services/participant_service"
import { getParticipants } from "@/services/participant_service";

// globale reactive variable
export const participants = ref<Participant[]>([]);

export function fetchParticipants() {
    getParticipants().then(response => {
        participants.value = response.data.participants;
    }).catch(error => {
        console.error("Error fetching participants:", error);
    });
}