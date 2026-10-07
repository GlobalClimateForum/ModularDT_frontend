import { ref } from 'vue';
import type { GlobalParameter } from "@/services/global_parameter_servics"

// globale reactive variable
export const globalParameters = ref<GlobalParameter[]>([]);

export async function fetchGlobalParameter() {
    /*await getSlides().then(response => {
        slides.value = response.data;
        response.data.forEach((slide: Slide) => {
            if (slide.sections && slide.sections.length > 0) {
                slide.mode = getSlideMode(slide.sections);
            }
        });
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
    */
}

