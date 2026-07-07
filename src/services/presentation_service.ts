import { api, marpApi } from "./api";
import type { Scene } from "./scene_service";

export interface Presentation {
    id?: number;
    name: string;
    description: string;
    created_at?: string | null;
    updated_at?: string | null;
    scenes: (Scene & { position: number })[];
}

export type PresentationPayload = Omit<Presentation, "id" | "created_at" | "updated_at">;

export const getPresentations = () => api.get("/presentations/");
export const savePresentation = (presentation: Omit<Presentation, "id" | "created_at" | "updated_at">) => {
    const payload = {
        ...presentation,
        scenes: presentation.scenes.map(scene => ({
            id: scene.id,
            position: scene.position
        }))
    };

    return api.post("/presentations/", payload);
}

export const updatePresentation = (id: number, presentation: Partial<Presentation>) =>
    api.patch(`/presentations/${id}/`, presentation);

export const deletePresentation = (id: number) => api.delete(`/presentations/${id}/`);

