import { api } from "./api";
import type { Scene } from "@/services/scene_service";
import type { Slide } from "@/services/slide_service";
import { settings } from '@/globals/settings'


export const sendMonitorUpdate = (monitorID: number, message: any) => api.patch("/monitor/" + monitorID + "/", message);
export const sendMonitorsUpdate = (message: any) => api.patch("/monitor/", message);

export const updateMonitorStatesFromScene = async (scene: Scene) => {
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
                    'event_type': 'slide_change',
                    'slide': grid[index]
                }
            }
            )
        } else {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project no slide ")
            sendMonitorUpdate((Number(index) + 1), {
                'payload': {
                    'event_type': 'slide_change',
                    'slide': 'null'
                }
            }
            )
        }

    }
}

export const updateMonitorStatesFromGriddedSlides = async (slides: ref<(Slide | null)[]>) => {
    for (let index in slides) {
        if (slides[index]) {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project slide ", slides[index])
            sendMonitorUpdate((Number(index) + 1), {
                'payload': {
                    'event_type': 'slide_change',
                    'slide': slides[index]
                }
            }
            )
        } else {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project no slide ")
            sendMonitorUpdate((Number(index) + 1), {
                'payload': {
                    'event_type': 'slide_change',
                    'slide': 'null'
                }
            }
            )
        }

    }
}

export const updateOneMonitor = async (slide: Slide, id: number) => {
    if (slide) {
        sendMonitorUpdate((id), {
            'payload': {
                'event_type': 'slide_change',
                'slide': slide
            }
        }
        )
    } else {
        sendMonitorUpdate((id), {
            'payload': {
                'event_type': 'slide_change',
                'slide': 'null'
            }
        }
        )
    }
}

export const updateSlideOnMonitors = async (slide: Slide) => {
    if (slide) {
        for (let id = 1; id <= settings.value.number_of_screens; id++) {
            //console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project slide ", grid[index])
            sendMonitorUpdate((id), {
                'payload': {
                    'event_type': 'slide_update',
                    'slide': slide
                }
            }
            )
        }
    } else {
        for (let id = 1; id <= settings.value.number_of_screens; id++) {
            sendMonitorUpdate((id), {
                'payload': {
                    'event_type': 'slide_update',
                    'slide': 'null'
                }
            }
            )
        }
    }
}