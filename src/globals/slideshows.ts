import { ref } from 'vue';
import type { Slideshow } from "@/services/slideshow_service"
import { getSlideshows } from "@/services/slideshow_service";

// globale reactive variable
export const slideshows = ref<Slideshow[]>([]);

export function fetchSlideshows() {
    getSlideshows().then(response => {
        slideshows.value = response.data.slideshows;
    }).catch(error => {
        console.error("Error fetching slideshows:", error);
    });
}