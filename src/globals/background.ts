// Vue-stuff
import { computed, type ComputedRef } from 'vue'
// globals and services
import { type Slide } from '@/services/slide_service'
import { settings } from '@/globals/settings'
import { slides } from '@/globals/slides'

export const backgroundSlideMonitor: ComputedRef<Slide | undefined> = computed<Slide | undefined>(() => {
  return slides.value.find(slide => slide.id === settings.value.background_monitor_slide);
})

export const backgroundSlideParticipant: ComputedRef<Slide | undefined> = computed<Slide | undefined>(() => {
  return slides.value.find(slide => slide.id === settings.value.background_participant_slide);
})
