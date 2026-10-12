import { type Slide, type SlideSection } from './slide_service';
import { computed } from 'vue';


export function saveDraft(slide: Slide, sections? : SlideSection[]) {
    const slideID = slide.id ? slide.id : 'new';
    if (sections) {
        slide.sections = sections;
    }
    localStorage.setItem(`draft_${slideID}`, JSON.stringify(slide));
}

export function loadDraft(slideID: number | undefined | null): Slide | null {
    const slideIDKey = slideID ? slideID : 'new';
    const draft = localStorage.getItem(`draft_${slideIDKey}`);
    if (draft) {
        return JSON.parse(draft) as Slide;
    }
    return null;
}

export function hasDraft(slideID?: number | null): boolean {
    return localStorage.getItem(`draft_${slideID ?? 'new'}`) !== null
}

export function clearDraft(slideID?: number | null): void {
    localStorage.removeItem(`draft_${slideID ?? 'new'}`);
}