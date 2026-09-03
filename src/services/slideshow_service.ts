import { api } from "./api";
import type { Slide } from "@/services/slide_service"
import { sendParticipantUpdate } from "@/services/participant_service";

export interface Slideshow {
  id: number;
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

export const updateLiveSlideshow = (liveslideshow) => api.patch("/liveslideshow/", liveslideshow);

export const startSlideshow = async (slideshow: Slideshow, participantseat: number) => {
    try {
        await sendParticipantUpdate(participantseat, {
          event_type: "start_slideshow",
          receiver: participantseat,
          slides: slideshow.slides
        });
        console.log("Slideshow ", slideshow.name, " started for participant seat ", participantseat);
    } catch (error) {
        console.error("Error starting slideshow:", error);
    }
}

export const stopSlideshow = async (participantseat: number) => {
    try {
        const response = await sendParticipantUpdate(participantseat, {
          event_type: "stop_slideshow",
          receiver: participantseat
        });
        console.log("Slideshow stopped for participant seat ", participantseat);
    } catch (error) {
        console.error("Error stopping slideshow:", error);
    }
}