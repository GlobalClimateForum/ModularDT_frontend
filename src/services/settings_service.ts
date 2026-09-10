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
    event_id: number | null;
    dev_mode: boolean;
    pin_set: boolean;
    pin_length: number;
}

export const getSettings = () => api.get("/settings/");
export const updateSettings = (settings: Settings) => api.patch("/settings/", settings);
export const authorizeModerator = (pin: string) => api.get(`/authorize/${pin}`).then((response) => response.data.valid);
export const changePin = (oldPin: string, newPin: string) => api.post("/authorize/", { old_pin: oldPin, new_pin: newPin }).then((response) => response.data.success);