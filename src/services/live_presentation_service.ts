import { api } from "./api";

//export const getLivePresentation = () => api.get("/livepresentation/");
export const updateLivePresentation = (livepresentation_message) => api.patch("/livepresentation/", livepresentation_message);
