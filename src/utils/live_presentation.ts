import { ref } from 'vue'

// globale reactive variable
const livePresentationState = ref({
  active: false,
  presentation: -1,
  current_scene: -1
})

// Diese Funktion gibt immer exakt dieselbe Instanz zurück
export function useLivePresentationState() {
  return livePresentationState
}