import {api, marpApi} from "./api";

export interface Slide {
    id?: number;
    name: string;
    markdown: string;
    created_at?: string | null;
    updated_at?: string | null;
    tags: string[];
    width?: number;
    height?: number;
}

export type SlidePayload = Omit<Slide, "id" | "created_at" | "updated_at">;

export const getSlides = () => api.get("/slides/");

export const saveSlide = (slide: Omit<Slide, "id" | "created_at" | "updated_at">) =>
    api.post("/slides/", slide);

export const updateSlide = (id: number, slide: Partial<SlidePayload>) =>
    api.patch(`/slides/${id}/`, slide);

export const deleteSlide = (id: number) => api.delete(`/slides/${id}/`);

export type AspectRatio = "16:9" | "4:3";

export const nearestAspectRatio = (width: number, height: number): AspectRatio => {
    const ratio = width / height;
    return Math.abs(ratio - 4 / 3) <= Math.abs(ratio - 16 / 9) ? "4:3" : "16:9";
};

export const renderSlide = (content: string, aspectRatio: AspectRatio = "16:9") =>
    marpApi.post("/render/", { content, aspectRatio });

export const removeTagFromSlide = (slideId: number, tag: string) => api.delete(`/tags/${tag}/slide/${slideId}/`);
export const addTagToSlide = (slideId: number, tag: string) => api.post(`/tags/${tag}/slide/${slideId}/`);