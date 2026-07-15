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





