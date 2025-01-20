<template>
	<div v-if="projectStore.currentProject" class="space-y-6">
		<div class="flex justify-between items-center">
			<h2 class="text-2xl font-bold">
				{{ projectStore.currentProject.name }}
			</h2>
			<div class="flex space-x-4">
				<button
					@click="editProject"
					class="bg-primary-600 text-white px-4 py-2 rounded"
				>
					Edit Project
				</button>
			</div>
		</div>

		<!-- Project Overview -->
		<div class="bg-white shadow rounded-lg p-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div>
					<h3 class="text-sm font-medium text-gray-500">Client</h3>
					<p class="mt-1">{{ projectStore.currentProject.client }}</p>
				</div>
				<div>
					<h3 class="text-sm font-medium text-gray-500">
						Contract Value
					</h3>
					<p class="mt-1">
						${{
							formatCurrency(
								projectStore.currentProject.contractValue
							)
						}}
					</p>
				</div>
				<div>
					<h3 class="text-sm font-medium text-gray-500">Status</h3>
					<p class="mt-1">
						<span
							:class="
								getStatusClass(
									projectStore.currentProject.status
								)
							"
							class="px-2 py-1 rounded-full text-xs"
						>
							{{ projectStore.currentProject.status }}
						</span>
					</p>
				</div>
				<div>
					<h3 class="text-sm font-medium text-gray-500">
						Contract Type
					</h3>
					<p class="mt-1">
						{{ projectStore.currentProject.contractType }}
					</p>
				</div>
				<div>
					<h3 class="text-sm font-medium text-gray-500">
						Start Date
					</h3>
					<p class="mt-1">
						{{ formatDate(projectStore.currentProject.startDate) }}
					</p>
				</div>
				<div>
					<h3 class="text-sm font-medium text-gray-500">Address</h3>
					<p class="mt-1">
						{{ projectStore.currentProject.address }}
					</p>
				</div>
			</div>
		</div>

		<!-- Buildings and Work Items -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="bg-white shadow rounded-lg p-6">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-lg font-medium">Buildings</h3>
					<button
						@click="addBuilding"
						class="text-primary-600 hover:text-primary-700"
					>
						Add Building
					</button>
				</div>
				<div class="space-y-4">
					<div
						v-for="building in buildings"
						:key="building.id"
						class="flex justify-between items-center p-4 border rounded"
					>
						<div>
							<p class="font-medium">{{ building.name }}</p>
							<p class="text-sm text-gray-500">
								{{ building.elevations?.length || 0 }}
								Elevations
							</p>
						</div>
						<button
							@click="editBuilding(building)"
							class="text-gray-600 hover:text-primary-600"
						>
							Edit
						</button>
					</div>
				</div>
			</div>

			<div class="bg-white shadow rounded-lg p-6">
				<div class="flex justify-between items-center mb-4">
					<h3 class="text-lg font-medium">Work Items</h3>
					<button
						@click="addWorkItem"
						class="text-primary-600 hover:text-primary-700"
					>
						Add Work Item
					</button>
				</div>
				<div class="space-y-4">
					<div
						v-for="item in workItems"
						:key="item.id"
						class="flex justify-between items-center p-4 border rounded"
					>
						<div>
							<p class="font-medium">
								{{ item.code }} - {{ item.description }}
							</p>
							<p class="text-sm text-gray-500">
								${{ formatCurrency(item.unitPrice) }}/{{
									item.unit
								}}
							</p>
						</div>
						<button
							@click="editWorkItem(item)"
							class="text-gray-600 hover:text-primary-600"
						>
							Edit
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useProjectStore } from "../../store/project";

const route = useRoute();
const projectStore = useProjectStore();
const buildings = ref([]);
const workItems = ref([]);

onMounted(async () => {
	const projectId = route.params.id as string;
	await projectStore.fetchProject(projectId);
	// TODO: Fetch buildings and work items
});

const formatCurrency = (value: number) => {
	return value.toLocaleString("en-US", { minimumFractionDigits: 2 });
};

const formatDate = (date: string) => {
	return new Date(date).toLocaleDateString();
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

const editProject = () => {
	// TODO: Implement edit project modal/form
};

const addBuilding = () => {
	// TODO: Implement add building modal/form
};

const editBuilding = (building) => {
	// TODO: Implement edit building modal/form
};

const addWorkItem = () => {
	// TODO: Implement add work item modal/form
};

const editWorkItem = (item) => {
	// TODO: Implement edit work item modal/form
};
</script>
