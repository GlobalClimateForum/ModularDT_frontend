import axios from "axios";
import { API_BASE_URL, MARP_API_BASE_URL } from '@/config'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
})

const uploadApi = axios.create({
    baseURL: API_BASE_URL,
});

const marpApi = axios.create({
    baseURL: MARP_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
})

export default api;
export { api, uploadApi, marpApi };
