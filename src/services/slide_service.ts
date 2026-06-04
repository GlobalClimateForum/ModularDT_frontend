import api from "./api";

export interface Slide {
    id: number; 
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export const getSlides = () => api.get("/slides/");
export const saveSlide = (slide: Omit<Slide, "id" | "created_at" | "updated_at">) => api.post("/slides/", slide);