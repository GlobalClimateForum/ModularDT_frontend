import type { Scene } from "@/services/scene_service";
import { settings } from '@/utils/settings'
import { api } from "@/services/api";

async function sendMonitorUpdate(monitorId: number, message: string) {
  // Die ID wandert direkt in den Pfad
  const url = `/monitor/${monitorId}/`;

  // Der Payload enthält nur noch die Nutzdaten
  const payload = {
    event_type: "slide_update",
    text: message
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || ''
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server-Error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Sent update for monitor ${monitorId}:`, result);
  } catch (error) {
    console.error('Error sending monitor update:', error);
  }
}


// Hilfsfunktion für den CSRF-Token (Standard bei Django)
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}


export function updateMonitorStates(scene: Scene) {
  const grid = Array(settings.value.number_of_screens).fill(null)

  scene.slides.forEach(slide => {
    if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
      grid[slide.position - 1] = slide
    }
  })

  for (let index in grid) {
    if (grid[index]) {
      console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project slide ", grid[index])
      sendMonitorUpdate((Number(index) + 1), grid[index]) 
    } else {
      console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project no slide ")
      sendMonitorUpdate((Number(index) + 1), "NULL") 
    }

  }
}
