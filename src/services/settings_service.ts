import {api, marpApi} from "./api";

export interface Settings {
    cs_url: string;
    number_of_screens: number;
    background_image: string;
    language: string;
    avatar_style: string;
    palette: string;
    theme: string;
    carto_api_key: string;
}

export const getSettings = () => api.get("/settings/");
export const updateSettings = (settings: Settings) => api.patch("/settings/", settings);

