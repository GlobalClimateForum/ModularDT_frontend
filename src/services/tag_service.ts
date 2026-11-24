import { api } from "./api";

export const getAvailableTags = () => api.get("/tags/available/");

export const removeTagFromSlide = (slideId: number, tag: string) => api.delete(`/tags/${tag}/slide/${slideId}/`);
export const addTagToSlide = (slideId: number, tag: string) => api.post(`/tags/${tag}/slide/${slideId}/`);
export const removeTagFromScene = (sceneId: number, tag: string) => api.delete(`/tags/${tag}/scene/${sceneId}/`);
export const addTagToScene = (sceneId: number, tag: string) => api.post(`/tags/${tag}/scene/${sceneId}/`);