async function sendMonitorUpdate(monitorId: number, message: string) {
  // Die ID wandert direkt in den Pfad
  const url = `/monitor/${monitorId}/update/`; 
  
  // Der Payload enthält nur noch die Nutzdaten
  const payload = {
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
