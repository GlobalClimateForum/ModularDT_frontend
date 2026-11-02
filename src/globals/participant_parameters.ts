import { ref } from 'vue';
import type { Participant } from "@/services/participant_service"

// globale reactive variable
export const participantParameters = ref<Map<string, Map<string, string>>>(new Map());
const participantParametersPerName = ref<Map<string, Map<string, string>>>(new Map());

export function updateParticipantParameters(parameter: string, participant_seat: string, value: string) {
  if (!participantParameters.value.has(participant_seat)) {
    participantParameters.value.set(participant_seat, new Map<string, string>());
  }

  participantParameters.value.get(participant_seat)?.set(parameter, value)
}

export function getCurrentParticipantParametersAsJSON(participants: Participant[]) {
  if (participants) {
    function getParticipantName(seat: number) {
      const index = participants.findIndex(item => item.seat === seat);
      if (index) { return participants[index].name } else { return "" }
    }

    const participantParametersPerParticipantName = new Map<string, Map<string, string>>(
      Array.from(participantParameters.value.entries()).map(([outerKey, innerMap]) => [
        getParticipantName(Number(outerKey)), innerMap])
    );

    return JSON.stringify(Object.fromEntries(Array.from(participantParametersPerParticipantName.entries(), ([k, v]) => [k, Object.fromEntries(v)])));
  } else {
    return ""
  }
}