<template>
	<div class="space-y-6">
		<div class="bg-white shadow rounded-lg p-6">
			<h2 class="text-2xl font-bold mb-4">Project Overview</h2>
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div
					v-for="stat in stats"
					:key="stat.label"
					class="bg-gray-50 p-4 rounded"
				>
					<p class="text-sm text-gray-500">{{ stat.label }}</p>
					<p class="text-2xl font-semibold">{{ stat.value }}</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="bg-white shadow rounded-lg p-6">
				<h3 class="text-lg font-semibold mb-4">Recent Projects</h3>
				<div class="space-y-4">
					<div
						v-for="project in recentProjects"
						:key="project.id"
						class="border-b pb-2 last:border-0"
					>
						<p class="font-medium">{{ project.name }}</p>
						<p class="text-sm text-gray-500">
							{{ project.status }}
						</p>
					</div>
				</div>
			</div>

			<div class="bg-white shadow rounded-lg p-6">
				<h3 class="text-lg font-semibold mb-4">Recent Expenses</h3>
				<div class="space-y-4">
					<div
						v-for="expense in recentExpenses"
						:key="expense.id"
						class="border-b pb-2 last:border-0"
					>
						<p class="font-medium">${{ expense.amount }}</p>
						<p class="text-sm text-gray-500">
							{{ expense.description }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useProjectStore } from "../store/project";
import { useExpenseStore } from "../store/expense";

const projectStore = useProjectStore();
const expenseStore = useExpenseStore();

const stats = ref([
	{ label: "Active Projects", value: 0 },
	{ label: "Total Revenue", value: "$0" },
	{ label: "This Month Expenses", value: "$0" },
	{ label: "Active Employees", value: 0 },
]);

const recentProjects = ref([]);
const recentExpenses = ref([]);

onMounted(async () => {
	await projectStore.fetchProjects();
	await expenseStore.fetchExpenses();

	recentProjects.value = projectStore.projects.slice(0, 5);
	recentExpenses.value = expenseStore.expenses.slice(0, 5);

	// Update stats
	stats.value[0].value = projectStore.projects.filter(
		(p) => p.status === "IN_PROGRESS"
	).length;
	// Add more stat calculations as needed
});
</script>
