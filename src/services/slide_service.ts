import {api, marpApi} from "./api";

export interface Slide {
    id?: number; 
    name: string;
    markdown: string;
    created_at?: string | null;
    updated_at?: string | null;
    tags: string[];
}

export type SlidePayload = Omit<Slide, "id" | "created_at" | "updated_at">;

export const getSlides = () => api.get("/slides/");

export const saveSlide = (slide: Omit<Slide, "id" | "created_at" | "updated_at">) =>
    api.post("/slides/", slide);

export const updateSlide = (id: number, slide: Partial<SlidePayload>) =>
    api.patch(`/slides/${id}/`, slide);

export const deleteSlide = (id: number) => api.delete(`/slides/${id}/`);

export const renderSlide = (content: string) => marpApi.post("/render/", content);

export const removeTagFromSlide = (slideId: number, tag: string) => api.delete(`/tags/${tag}/slide/${slideId}/`);
export const addTagToSlide = (slideId: number, tag: string) => api.post(`/tags/${tag}/slide/${slideId}/`);