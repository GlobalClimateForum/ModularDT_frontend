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
export const getScene = (id: number) => api.get(`/scenes/${id}/`);
export const storeScene = async (scene: Omit<Scene, "id" | "created_at" | "updated_at">) : Promise<{ id: number }>  => {
  const message = {
    ...scene,
    slide_positions: scene.slides.map(slide => ({
      id: slide.id,
      position: slide.position
    }))
  };

  const response = await api.post<{ id: number }>("/scenes/", message);
  console.log("storeScene response: ", response.data);
  return response.data;
}

export const updateScene = async (id: number, scene: Partial<ScenePayload>) => {
  const payload = {
    ...scene,
    slide_positions: scene.slides?.map(slide => ({
      id: slide.id,
      position: slide.position
    }))
  };
  return await api.patch(`/scenes/${id}/`, payload);
};

export const deleteScene = (id: number) => api.delete(`/scenes/${id}/`);

export const removeTagFromScene = (sceneId: number, tag: string) => api.delete(`/tags/${tag}/scene/${sceneId}/`);
export const addTagToScene = (sceneId: number, tag: string) => api.post(`/tags/${tag}/scene/${sceneId}/`);