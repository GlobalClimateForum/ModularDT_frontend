import { api } from "./api";
import type { Scene } from "@/services/scene_service";
import { settings } from '@/globals/settings'


export const sendMonitorUpdate = (monitorID: number, message: any) => api.patch("/monitor/" + monitorID + "/", message);

export const updateMonitorStates = async (scene: Scene) => {
    const grid = Array(settings.value.number_of_screens).fill(null)

    scene.slides.forEach(slide => {
        if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
            grid[slide.position - 1] = slide
        }
    })

    for (let index in grid) {
        if (grid[index]) {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project slide ", grid[index])
            sendMonitorUpdate((Number(index) + 1), {
                'payload': {
                    'event_type': 'slide_update',
                    'slide': grid[index]
                }
            }
            )
        } else {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project no slide ")
            sendMonitorUpdate((Number(index) + 1), {
                'payload': {
                    'event_type': 'slide_update',
                    'slide': 'null'
                }
            }
            )
        }

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


/*
export const stopPresentation = async () => {
    livePresentationState.value.active = false;
    livePresentationState.value.presentation = -1;
    livePresentationState.value.current_scene = 1;

    try {
        const response = await updateLivePresentation({
            active: false
        });
        console.log("Live Presentation stoped.");
    } catch (error) {
        console.error("Error stopping presentation:", error);
    }
}

export const startPresentation = async (presentationid) => {
    livePresentationState.value.active = true;
    livePresentationState.value.presentation = presentationid;
    livePresentationState.value.current_scene = 1;

    try {
        const response = await updateLivePresentation({
            active: true,
            presentation: presentationid,
            current_scene: 1
        });
        console.log("Live Presentation started.");
    } catch (error) {
        console.error("Error starting presentation:", error);
    }
}
*/