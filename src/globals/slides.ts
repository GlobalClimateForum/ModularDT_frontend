import { ref } from 'vue';
import type { Slide, SlideSection } from "@/services/slide_service"
import { getSlides, getSlide } from "@/services/slide_service";
import { slideSectionDefaults } from './slide_section_defaults';

// globale reactive variables
export const slides = ref<Slide[]>([]);
export const selectedSlideInSlideManager = ref<Slide | null>(null);
export const selectedSlideInLiveSlides = ref<Slide | null>(null);
export const selectedSlideInSceneEditor = ref<Slide | null>(null);
export const selectedSlideInParticipantSlideshow = ref<Slide | null>(null);

export function createDefaultSlideSection(viewType: string = 'markdown'): SlideSection {
    const defaults = slideSectionDefaults[viewType] ?? slideSectionDefaults['markdown'];
    return structuredClone({
        id: null,
        ...defaults,
        view_type: viewType,
    }) as SlideSection
}

// Fetch slides from the backend and update the reactive variable
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

// fetch slide by id
export async function updateSlideByID(id: number): Promise<void> {
    try {
        const response = await getSlide(id);
        const slideData = response.data;
        const slideIndexFound = slides.value.findIndex(slide => slide.id === id);

        if (slideIndexFound >= 0) {
            // Update existing slide
            slides.value[slideIndexFound] = {
                ...slides.value[slideIndexFound],
                ...slideData,
            };
            /*if (slide.sections && slide.sections.length > 0) {
                slide.mode = getSlideMode(slide.sections);
            }*/
        } else {
            // Add new slide
            slides.value.push({
                ...slideData
            });
        }
    } catch (error) {
        console.error("Error fetching slide ", id, ":", error);
    }
}

// Update the slide in the reactive variable after a successful update operation
// Without fetching all slides again
export function updateSlideBySlide(updatedSlide: Slide) {
    const index = slides.value.findIndex(slide => slide.id === updatedSlide.id);
    if (index !== -1) {
        slides.value[index] = updatedSlide;
    } else {
        slides.value.push(updatedSlide);
    }
}

export function getSlideMode(sections: SlideSection[]): string {
    return sections.some(section => section.mode === 'interactive') ? 'interactive' : 'static';
}

export function getSlideById(id: number): Slide | undefined {
    return slides.value.find(slide => slide.id === id);
}

export function getSlideBySectionId(id: number): Slide | undefined {
    return slides.value.find(slide => (slide.sections?.find(section => section.id === id)) != null);
}

// Section Defaults
export function createDefaultSlide(): Slide {
    return {
        name: '',
        width: 1920,
        height: 1080,
        tags: [],
    }
}