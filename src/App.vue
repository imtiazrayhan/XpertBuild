<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  HomeIcon,
  BriefcaseIcon,
  UsersIcon,
  ClockIcon,
  BanknotesIcon,
  Squares2X2Icon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()

const navItems = [
  { name: 'Dashboard', icon: HomeIcon, route: 'home' },
  { name: 'Projects', icon: BriefcaseIcon, route: 'projects' },
  { name: 'Employees', icon: UsersIcon, route: 'employees' },
  { name: 'Timesheet', icon: ClockIcon, route: 'timesheet' },
  { name: 'Expenses', icon: BanknotesIcon, route: 'expenses' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <div class="w-64 bg-gray-800 min-h-screen">
      <div class="px-6 py-6">
        <div class="flex items-center space-x-2">
          <Squares2X2Icon class="w-6 h-6 text-white" />
          <span class="text-xl font-bold text-white">XpertBuild</span>
        </div>
      </div>

      <nav class="mt-8">
        <div class="px-3 space-y-2">
          <button
            v-for="item in navItems"
            :key="item.name"
            @click="router.push({ name: item.route })"
            :class="[
              'w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150',
              route.name === item.route
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white',
            ]"
          >
            <component :is="item.icon" class="w-5 h-5 mr-3" />
            {{ item.name }}
          </button>
        </div>
      </nav>
    </div>

    <div class="flex-1">
      <main class="container mx-auto px-8 py-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
