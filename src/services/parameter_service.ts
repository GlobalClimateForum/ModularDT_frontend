import { api } from "./api";

export const getParameters = async () => await api.get("/parameters/");