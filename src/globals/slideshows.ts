import { ref } from 'vue';
import type { Slideshow } from "@/services/slideshow_service"
import { getSlideshows } from "@/services/slideshow_service";

// globale reactive variable
export const slideshows = ref<Slideshow[]>([]);

// Fetch slideshows from the backend and update the reactive variable
export function fetchSlideshows() {
    return getSlideshows().then(response => {
        slideshows.value = response.data.slideshows;
    }).catch(error => {
        console.error("Error fetching slideshows:", error);
    });
}

// Fetch slideshows from the backend and update the reactive variable
export async function asyncFetchSlideshows() {
    try {
        const response = await getSlideshows()
        slideshows.value = response.data.slideshows;
    } catch (error) {
        console.error("Error asynchronous fetching slideshows:", error);
    }
}