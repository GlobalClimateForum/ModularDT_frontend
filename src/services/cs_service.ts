import { settings } from "@/utils/settings";
import { computed, shallowRef } from "vue";
import axios from "axios";

const contentServer = shallowRef<ReturnType<typeof axios.create> | null>(null);
const contentServerStatus = shallowRef<string | null>(null);

function registerContentServer() {
    contentServer.value = axios.create({
        baseURL: settings.value.cs_url,
        headers: { "Content-Type": "application/json" },
    });
    getContentServerStatus()
}

async function getContentServerStatus() {
    if (!contentServer.value) {
        contentServerStatus.value = "not registered";
        return { status: "not registered", message: "Content server is not registered." };
    } else {
        return contentServer.value.get("/health").then(response => {
            contentServerStatus.value = "registered";
            return { status: "registered", message: "Content server is registered.", data: response.data };
        }).catch(error => {
            contentServerStatus.value = "error";
            return { status: "error", message: "Error occurred while fetching content server status." };
        });
    }
}

const contentServerStatusClass = computed(() => {
    switch (contentServerStatus.value) {
        case "registered": return "success";
        case "error": return "error";
        default: return "warning";
    }
});


export { contentServer, registerContentServer, getContentServerStatus, contentServerStatus, contentServerStatusClass }