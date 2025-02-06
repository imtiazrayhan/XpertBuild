<script setup lang="ts">
import { ref } from 'vue'
import {
  HomeIcon,
  BriefcaseIcon,
  UsersIcon,
  ClockIcon,
  BanknotesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
} from '@heroicons/vue/24/outline'
import { icons, User } from 'lucide-react'

const currentPage = ref('dashboard')
const expandedMenus = ref<string[]>([])

const navItems = [
  { name: 'Dashboard', icon: HomeIcon, route: '/' },
  { name: 'Projects', icon: BriefcaseIcon, route: '/projects' },
  { name: 'Expenses', icon: BanknotesIcon, route: '/expenses' },
  { name: 'Materials', icon: ShoppingCartIcon, route: '/materials' },
  { name: 'Timesheet', icon: ClockIcon, route: '/timesheet' },
  {
    name: 'Employees',
    icon: UsersIcon,
    children: [
      { name: 'Employee List', route: '/employees' },
      { name: 'Union Classes', icon: UserGroupIcon, route: '/union-classes' },
    ],
  },
  { name: 'Clients', icon: InformationCircleIcon, route: '/clients' },
]

const toggleMenu = (menuName: string) => {
  if (expandedMenus.value.includes(menuName)) {
    expandedMenus.value = expandedMenus.value.filter((name) => name !== menuName)
  } else {
    expandedMenus.value.push(menuName)
  }
}

const isMenuExpanded = (menuName: string) => expandedMenus.value.includes(menuName)
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
          <template v-for="item in navItems" :key="item.name">
            <!-- Regular menu item -->
            <router-link v-if="!item.children" :to="item.route" v-slot="{ isActive }">
              <button
                :class="[
                  'w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                ]"
              >
                <component :is="item.icon" class="w-5 h-5 mr-3" />
                {{ item.name }}
              </button>
            </router-link>

            <!-- Menu item with submenu -->
            <div v-else class="space-y-1">
              <button
                @click="toggleMenu(item.name)"
                :class="[
                  'w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150',
                  isMenuExpanded(item.name)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                ]"
              >
                <div class="flex items-center">
                  <component :is="item.icon" class="w-5 h-5 mr-3" />
                  {{ item.name }}
                </div>
                <ChevronDownIcon
                  class="w-4 h-4 transition-transform duration-200"
                  :class="{ 'transform rotate-180': isMenuExpanded(item.name) }"
                />
              </button>

              <!-- Submenu items -->
              <div v-show="isMenuExpanded(item.name)" class="pl-11 space-y-1">
                <router-link
                  v-for="child in item.children"
                  :key="child.name"
                  :to="child.route"
                  v-slot="{ isActive }"
                >
                  <button
                    :class="[
                      'w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    ]"
                  >
                    {{ child.name }}
                  </button>
                </router-link>
              </div>
            </div>
          </template>
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
