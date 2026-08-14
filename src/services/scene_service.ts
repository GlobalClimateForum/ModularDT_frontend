import { api } from "./api";
import type { Slide } from "@/services/slide_service"

export interface Scene {
  id?: number;
  name: string;
  description: string;
  created_at?: string | null;
  updated_at?: string | null;
  tags: string[];
  slides: (Slide & { position: number })[];
}

export type ScenePayload = Omit<Scene, "id" | "created_at" | "updated_at">;

export const getScenes = () => api.get("/scenes/");
export const saveScene = (scene: Omit<Scene, "id" | "created_at" | "updated_at">) => {
  const payload = {
    ...scene,
    slide_positions: scene.slides.map(slide => ({
      id: slide.id,
      position: slide.position
    }))
  };

  return api.post("/scenes/", payload);
}

export const updateScene = (id: number, scene: Partial<ScenePayload>) => {
  const payload = {
    ...scene,
    slide_positions: scene.slides?.map(slide => ({
      id: slide.id,
      position: slide.position
    }))
  };
  return api.patch(`/scenes/${id}/`, payload);
};


export const deleteScene = (id: number) => api.delete(`/scenes/${id}/`);

export const removeTagFromScene = (sceneId: number, tag: string) => api.delete(`/tags/${tag}/scene/${sceneId}/`);
export const addTagToScene = (sceneId: number, tag: string) => api.post(`/tags/${tag}/scene/${sceneId}/`);