import { ref } from 'vue';

// globale reactive variable
export const participantParameters = ref<Map<string, Map<string,string>>>(new Map());

export function updateParticipantParameters(parameter: string, participant: string, value: string) {
  if (!participantParameters.value.has(participant)) {
    participantParameters.value.set(participant, new Map<string, string>());
  }

  participantParameters.value.get(participant)?.set(parameter, value)
}