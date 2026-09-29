import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Moderator from '@/views/Moderator.vue'
import Monitor from '@/views/Monitor.vue'
import Participant from '@/views/Participant.vue'
import Login from '@/views/Login.vue'
import {isModerator} from "@/services/settings_service";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/home', name: 'home', component: Home },
        { path: '/', redirect: '/home' }, 
        { path: '/moderator', name: 'moderator', component: Moderator, meta: { requiresAuth: true } },
        { path: '/monitor/:id(\\d+)', name: 'monitor', component: Monitor },
        { path: '/participant/:id(\\d+)', name: 'participant', component: Participant },
        { path: '/login', name: 'login', component: Login },
        // A 404-Catch-All route for invalid paths, which redirects to the home page
        { path: '/:pathMatch(.*)*', redirect: '/home' }
    ],
})

router.beforeEach((to) => {
    if (to.meta.requiresAuth && !isModerator()) {
        return '/login'
    }
})
export default router