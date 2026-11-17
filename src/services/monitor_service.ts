import { type Ref } from "vue";
import { api } from "./api";
import type { Scene } from "@/services/scene_service";
import type { Slide } from "@/services/slide_service";
import { settings } from '@/globals/settings'

export const sendMonitorMessage = (monitorID: number, message: any) => api.patch("/monitor/" + monitorID + "/", message);
export const sendMonitorsMessage = (message: any) => api.patch("/monitor/", message);

export function updateMonitorStatesFromScene(scene: Scene) {
    const grid = Array(settings.value.number_of_screens).fill(null)

    scene.slides.forEach(slide => {
        if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
            grid[slide.position - 1] = slide
        }
    })

    for (let index in grid) {
        if (grid[index]) {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project slide ", grid[index])
            sendMonitorMessage((Number(index) + 1), {
                'event_type': 'slide_change',
                'slide': grid[index]
            })
        } else {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project no slide ")
            sendMonitorMessage((Number(index) + 1), {
                'event_type': 'slide_change',
                'slide': 'null'
            })
        }
    }
}

export function updateMonitorStatesFromGriddedSlides(slides: Ref<(Slide | null)[]>) {
    for (let index in slides.value) {
        if (slides.value[index]) {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project slide ", slides.value[index])
            sendMonitorMessage((Number(index) + 1), {
                'event_type': 'slide_change',
                'slide': slides.value[index]
            })
        } else {
            console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project no slide ")
            sendMonitorMessage((Number(index) + 1), {
                'event_type': 'slide_change',
                'slide': 'null'
            })
        }

    }
}

export function changeSlideOnOneMonitor(slide: Slide, id: number) {
    if (slide) {
        sendMonitorMessage((id), {
            'event_type': 'slide_change',
            'slide': slide
        })
    } else {
        sendMonitorMessage((id), {
            'event_type': 'slide_change',
            'slide': 'null'
        }
        )
    }
}

export function updateSlideOnAllMonitors(slide: Slide) {
    if (slide) {
        for (let id = 1; id <= settings.value.number_of_screens; id++) {
            //console.debug("updateMonitorStates: Monitor ", (Number(index) + 1), " project slide ", grid[index])
            sendMonitorMessage((id), {
                'event_type': 'slide_update',
                'slide': slide
            })
        }
    } else {
        for (let id = 1; id <= settings.value.number_of_screens; id++) {
            sendMonitorMessage((id), {
                    'event_type': 'slide_update',
                    'slide': 'null'
            })
        }
    }
}
