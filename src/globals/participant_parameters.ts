import { ref } from 'vue';
import type { Participant } from "@/services/participant_service"
import { participants } from "@/globals/participants";
import { useParameterStore } from '@/services/parameterstore_service';
import type { ParameterChange } from '@/services/parameterstore_service';

// Helper function to get participant name by seat number
export function getParticipantName(seat: number, participants: Participant[]): string | null {
  return participants.find(p => p.seat === seat)?.name ?? null
}

// globale reactive variable
export const participantParameters = ref<Map<string, Map<string, string>>>(new Map());

export function updateParticipantParameters(parameter: string, participant_seat: string, value: string) {

  const parameterStore = useParameterStore();

  if (!participantParameters.value.has(participant_seat)) {
    participantParameters.value.set(participant_seat, new Map<string, string>());
  }
  participantParameters.value.get(participant_seat)?.set(parameter, value)

  const pseat = Number(participant_seat);
  const pname = getParticipantName(pseat, participants.value) || "Unknown";
  console.log("update: ", pname, " on seat ", pseat, " ",parameter,": ",value)

  if (pseat) {
    const parameterChange: ParameterChange = {
      section: 'participant',
      participantSeat: pseat,
      participantName: pname,
      parameter: parameter,
      value: value
    };
    parameterStore.set(parameterChange);
  }



}