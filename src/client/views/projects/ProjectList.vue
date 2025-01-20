<template>
	<div>
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-2xl font-bold">Projects</h2>
			<button
				@click="openNewProject"
				class="bg-primary-600 text-white px-4 py-2 rounded"
			>
				New Project
			</button>
		</div>

		<div class="bg-white shadow rounded-lg">
			<div class="p-4 border-b">
				<input
					v-model="searchQuery"
					type="text"
					placeholder="Search projects..."
					class="w-full px-3 py-2 border rounded"
				/>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead>
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Project Name
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Client
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Contract Value
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Status
							</th>
							<th class="px-6 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						<tr
							v-for="project in filteredProjects"
							:key="project.id"
							class="hover:bg-gray-50"
						>
							<td class="px-6 py-4">
								<router-link
									:to="'/projects/' + project.id"
									class="text-primary-600 hover:underline"
								>
									{{ project.name }}
								</router-link>
							</td>
							<td class="px-6 py-4">{{ project.client }}</td>
							<td class="px-6 py-4">
								${{ formatCurrency(project.contractValue) }}
							</td>
							<td class="px-6 py-4">
								<span
									:class="getStatusClass(project.status)"
									class="px-2 py-1 rounded-full text-xs"
								>
									{{ project.status }}
								</span>
							</td>
							<td class="px-6 py-4 text-right">
								<button
									@click="openEditProject(project)"
									class="text-gray-600 hover:text-primary-600"
								>
									Edit
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useProjectStore } from "../../store/project";

const projectStore = useProjectStore();
const searchQuery = ref("");

onMounted(() => {
	projectStore.fetchProjects();
});

const filteredProjects = computed(() => {
	return projectStore.projects.filter(
		(project) =>
			project.name
				.toLowerCase()
				.includes(searchQuery.value.toLowerCase()) ||
			project.client
				.toLowerCase()
				.includes(searchQuery.value.toLowerCase())
	);
});

const formatCurrency = (value: number) => {
	return value.toLocaleString("en-US", { minimumFractionDigits: 2 });
};

const getStatusClass = (status: string) => {
	const classes = {
		PLANNING: "bg-yellow-100 text-yellow-800",
		IN_PROGRESS: "bg-blue-100 text-blue-800",
		COMPLETED: "bg-green-100 text-green-800",
		ON_HOLD: "bg-red-100 text-red-800",
	};
	return classes[status] || "";
};

const openNewProject = () => {
	// TODO: Implement new project modal/form
};

const openEditProject = (project) => {
	// TODO: Implement edit project modal/form
};
</script>
