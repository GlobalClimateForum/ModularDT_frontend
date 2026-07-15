import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Moderator from '@/views/Moderator.vue'
import Monitor from '@/views/Monitor.vue'
import Participant from '@/views/Participant.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/home', name: 'home', component: Home },
        { path: '/', redirect: '/home' }, 
        { path: '/moderator', name: 'moderator', component: Moderator },
        { path: '/monitor/:id(\\d+)', name: 'monitor', component: Monitor },
        { path: '/participant/:id(\\d+)', name: 'participant', component: Participant },
        // A 404-Catch-All route for invalid paths, which redirects to the home page
        { path: '/:pathMatch(.*)*', redirect: '/home' }
    ],
})

export default router