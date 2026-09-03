import { ref } from 'vue';

export interface liveParticipantSlideshow {
  participant_seat: number;
  slideshow_id: number;
  current_slide_index: number;
}

// globale reactive variable
export const liveParticipantsSlideshow = ref<liveParticipantSlideshow[]>([]);

// This function returns always the SAME instance
export function useLiveParticipantsSlideshow() {
  return liveParticipantsSlideshow
}

export function updateLiveParticipantsSlideshow(newLiveParticipantSlideshow: liveParticipantSlideshow) {
  const index = liveParticipantsSlideshow.value.findIndex(item => item.participant_seat === newLiveParticipantSlideshow.participant_seat);

  if (index !== -1) {
    liveParticipantsSlideshow.value[index] = newLiveParticipantSlideshow;
  } else {
    liveParticipantsSlideshow.value.push(newLiveParticipantSlideshow);
  }
}

export function deleteLiveParticipantsSlideshow(deletedLiveParticipantSlideshow: liveParticipantSlideshow) {
  const index = liveParticipantsSlideshow.value.findIndex(item => item.participant_seat === deletedLiveParticipantSlideshow.participant_seat);

  if (index !== -1) {
    liveParticipantsSlideshow.value.splice(index, 1);
  }
}