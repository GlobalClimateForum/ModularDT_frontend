import { ref } from 'vue';
import type { Participant } from "@/services/participant_service"
import { participants } from "@/globals/participants";
import { useParameterStore } from '@/services/parameterstore_service';


// globale reactive variable
export const participantParameters = ref<Map<string, Map<string, string>>>(new Map());

export function updateParticipantParameters(parameter: string, participant_seat: string, value: string) {

  const parameterStore = useParameterStore();

  if (!participantParameters.value.has(participant_seat)) {
    participantParameters.value.set(participant_seat, new Map<string, string>());
  }
  
  parameterStore.set({
    section: 'participant',
    seat: Number(participant_seat),
    parameter: parameter,
    value: value
  });

}

export function getCurrentParticipantParametersAsJSON() {

  let participants_ = participants.value

  if (participants_) {
    
    function getParticipantName(seat: number) {
      const index = participants_.findIndex(item => item.seat === seat);
      if (index) { return participants_[index].name } else { return "" }
    }

    const participantParametersPerParticipantName = new Map<string, Map<string, string>>(
      Array.from(participantParameters.value.entries()).map(([outerKey, innerMap]) => [
        getParticipantName(Number(outerKey)), innerMap])
    );

    console.log("participantParametersPerParticipantName:", participantParametersPerParticipantName)

    return JSON.stringify(Object.fromEntries(Array.from(participantParametersPerParticipantName.entries(), ([k, v]) => [k, Object.fromEntries(v)])));
  } else {
    return ""
  }
}