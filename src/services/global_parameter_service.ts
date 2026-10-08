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

export const getGlobalParameter = async () => await api.get("/globalparameters/");
export const saveGlobalParameter = (globalparameter: Omit<GlobalParameter, "id">) => {
    console.log("globalparameter: ", globalparameter)
    api.post("/globalparameters/", { ...globalparameter });
}


