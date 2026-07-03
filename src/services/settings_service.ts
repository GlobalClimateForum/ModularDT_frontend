import {api, marpApi} from "./api";

export interface Settings {
    cs_url: string;
    number_of_screens: number;
    background_image: string;
    language: string;
}

export const getSettings = () => api.get("/settings/");

export const updateSettings = (settings: Settings) => api.patch("/settings/", settings);

