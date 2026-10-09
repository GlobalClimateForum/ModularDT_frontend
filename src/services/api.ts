import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/',
    headers: {
        "Content-Type": "application/json",
    },
})

const uploadApi = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/',
});

const marpApi = axios.create({
    baseURL: import.meta.env.VITE_MARP_API_BASE_URL || 'http://localhost:3000/',
    headers: {
        "Content-Type": "application/json",
    },
})



export default api;
export { api, uploadApi, marpApi };
