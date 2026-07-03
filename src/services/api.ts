import axios from "axios";

let contentServer:null | ReturnType<typeof axios.create>;

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
})

const marpApi = axios.create({
    baseURL: import.meta.env.VITE_MARP_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
})

function registerContentServer(baseURL:string) {
    contentServer = axios.create({
        baseURL: baseURL,
        headers: {
            "Content-Type": "application/json",
        },
    })
}

function getContentServerStatus() {
    if (!contentServer) {
        return {status: 404, data: {message: "Content server not registered"}}
    } else {
        // Test if content Server is reachable 
        contentServer.get("/health/").then((response) => {
            return response;
        }).catch((error) => {
            return {status: 500, data: {message: "Content server not reachable"}}
        })
    }
}

export default api;
export { api, marpApi, contentServer, registerContentServer, getContentServerStatus };

