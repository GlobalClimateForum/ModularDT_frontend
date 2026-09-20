import { ref } from 'vue';
import type { Slide, SlideSection } from "@/services/slide_service"
import { getSlides } from "@/services/slide_service";

// globale reactive variable
export const slides = ref<Slide[]>([]);

export async function fetchSlides() {
    await getSlides().then(response => {
        slides.value = response.data;
        response.data.forEach((slide: Slide) => {
            if (slide.sections && slide.sections.length > 0) {
                slide.mode = getSlideMode(slide.sections);
            }
        });
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
}

export function getSlideMode(sections: SlideSection[]): string {
    return sections.some(section => section.mode === 'interactive') ? 'interactive' : 'static';
}

export function getSlideById(id: number): Slide | undefined {
    return slides.value.find(slide => slide.id === id);
}
