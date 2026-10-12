import { api } from "./api";

export interface GlobalParameter {
  id?: number;
  name: string;
  description: string;
  ptype: string;
  connect_all: Boolean;
  pvalues: string[]
  connected_slide_parameters: number[];
}

export const getGlobalParameters = async () => await api.get("/globalparameters/");
export const saveGlobalParameter = (globalparameter: Omit<GlobalParameter, "id">) => {
    console.log("globalparameter: ",globalparameter)
    return api.post("/globalparameters/", { ...globalparameter });
}

export const deleteGlobalParameter = (id: number) => api.delete(`/globalparameters/${id}/`);
export const deleteGlobalParameters = async () => await api.delete("/globalparameters/");

