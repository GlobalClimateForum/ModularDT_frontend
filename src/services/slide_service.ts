import {api, marpApi} from "./api";

export interface Slide {
    id: number; 
    name: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export type SlidePayload = Omit<Slide, "id" | "created_at" | "updated_at">;

export const getSlides = () => api.get("/slides/");

export const saveSlide = (slide: Omit<Slide, "id" | "created_at" | "updated_at">) =>
    api.post("/slides/", slide);

export const updateSlide = (id: number, slide: Partial<SlidePayload>) =>
    api.patch(`/slides/${id}/`, slide);

export const deleteSlide = (id: number) => api.delete(`/slides/${id}/`);
export const renderSlide = (content: string) => marpApi.post("/render/", content);