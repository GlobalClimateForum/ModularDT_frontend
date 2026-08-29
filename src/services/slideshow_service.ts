import { api } from "./api";
import type { Slide } from "@/services/slide_service"

export interface Slideshow {
  id?: number;
  name: string;
  description: string;
  created_at?: string | null;
  updated_at?: string | null;
  slides: (Slide & { position: number })[];
}

export type SlideshowPayload = Omit<Slideshow, "id" | "created_at" | "updated_at">;

export const getSlideshows = () => api.get("/slideshows/");
export const saveSlideshow = (slideshow: Omit<Slideshow, "id" | "created_at" | "updated_at">) => {
  const payload = {
    ...slideshow,
    slide_positions: slideshow.slides?.map(slide => ({
      id: slide.id,
      position: slide.position
    }))
  };

  return api.post("/slideshows/", payload);
}

export const updateSlideshow = (id: number, slideshow: {slides: {slide_id: number; position: number;}[];}) => {
  const payload = {
    slide_positions: slideshow.slides,
  };

  return api.patch(`/slideshows/${id}/`, payload);
};



export const deleteSlideshow = (id: number) => api.delete(`/slideshows/${id}/`);
