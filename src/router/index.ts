import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Moderator from '@/views/Moderator.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/home', name: 'home', component: Home },
        { path: '/', redirect: '/home' }, 
        { path: '/moderator', name: 'moderator', component: Moderator },
    ],
})

export default router