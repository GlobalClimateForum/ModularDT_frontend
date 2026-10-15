import { ref } from 'vue';
import type { Slide, SlideSection } from "@/services/slide_service"
import { getSlides, updateSlide, saveSlide } from "@/services/slide_service";
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";
import { useI18n } from 'vue-i18n';

// globale reactive variable
export const slides = ref<Slide[]>([]);

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

// Update the slide in the reactive variable after a successful update operation
// Without fetching all slides again
export function updateSlideStore(updatedSlide: Slide) {
    const index = slides.value.findIndex(slide => slide.id === updatedSlide.id);
    if (index !== -1) {
        slides.value[index] = updatedSlide;
    } else {
        slides.value.push(updatedSlide);
    }
}

export function useSlide() {

    const { t } = useI18n();
    const savingSlide = ref<boolean>(false)
    const confirm = useConfirm();
    const toast = useToast();


    // Persist slide and sections to the backend and the store
    // Resolves the saved slide or null if the operation was cancelled
    async function persist(
        slide: Omit<Slide, 'sections'>,
        sections: Omit<SlideSection, '_key'>[],
    ): Promise<Slide | null> {
        savingSlide.value = true

        try {

            // Check if the slide has an ID (update) or not (create)
            const shouldUpdate = slide.id !== undefined && slide.id !== null

            if (shouldUpdate) { // If updating, confirm with the user before proceeding

                // Show confirmation dialog and wait for user response
                const confirmed = await new Promise<boolean>((resolve) => {

                    confirm.require({
                        header: t('moderator.confirmation'),
                        message:
                            `${t('moderator.update-slide-confirmation-message-head')} ` +
                            `${slide.name} ` +
                            `${t('moderator.update-slide-confirmation-message-tail')}`,
                        acceptLabel: t('moderator.confirmation-ok'),
                        rejectLabel: t('moderator.confirmation-cancel'),

                        accept: () => resolve(true),

                        reject: () => {
                            toast.add({ severity: 'info', summary: 'Cancelled', detail: 'Slide update cancelled', life: 3000 })
                            resolve(false)
                        },
                    })
                })

                // If the user did not confirm, return null to indicate cancellation
                if (!confirmed) {
                    return null // User cancelled the update - Jump out of the function early
                }
            }

            // Either User confirmed the update or it's a new slide, proceed to persist the slide and sections
            // Persist the slide and sections to the backend
            const response = shouldUpdate ? await updateSlide(slide.id!, slide, sections) : await saveSlide(slide, sections)
            const savedSlide = response.data.slide as Slide | undefined

            // Error handling: If the backend did not return a saved slide, throw an error
            if (!savedSlide) {
                throw new Error('Server did not return a saved slide')
            } else { // If the backend returned a saved slide, update the store and show a success toast
                // Persist the saved slide to the store
                updateSlideStore(savedSlide)
                const successMessage = shouldUpdate ? t('moderator.slide-updated-success') : t('moderator.slide-saved-success')
                toast.add({ severity: 'success', summary: 'Success',   detail: successMessage,  life: 3000 })
            }
            return savedSlide
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000, })
            throw error
        } finally {
            savingSlide.value = false
        }
    }

    return {
        savingSlide,
        persist
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

export function createDefaultSection(): SlideSection {
    return {
        view_type: 'markdown',
        width_fraction: 1,
        content: '',
        content_path: '',
        mode : 'static',
        parameters: {},
        url_pattern: '',
        properties: {bg: '#ffffff', autosize: false},
    }
}