import { api } from "./api";

export interface GlobalParameter {
  id?: number;
  name: string;
  description: string;
  map_all: Boolean
}

export const getGlobalParameter = async () => await api.get("/slides/");

export const saveGlobalParameter = (slide: Omit<Slide, "id" | "created_at" | "updated_at">, sections: SlideSection[]) =>
    api.post("/slides/", { ...slide, sections });


