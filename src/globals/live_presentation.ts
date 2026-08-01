import { ref } from 'vue'

// globale reactive variable
const livePresentationState = ref({
  active: false,
  presentation: -1,
  current_scene: 1
})

// This function returns always the SAME instance
export function useLivePresentationState() {
  return livePresentationState
}