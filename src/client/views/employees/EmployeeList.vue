<template>
	<div>
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-2xl font-bold">Employees</h2>
			<button
				@click="openNewEmployee"
				class="bg-primary-600 text-white px-4 py-2 rounded"
			>
				New Employee
			</button>
		</div>

		<div class="bg-white shadow rounded-lg">
			<div class="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-4">
				<input
					v-model="filters.search"
					type="text"
					placeholder="Search employees..."
					class="px-3 py-2 border rounded"
				/>
				<select
					v-model="filters.classification"
					class="px-3 py-2 border rounded"
				>
					<option value="">All Classifications</option>
					<option value="OFFICE">Office</option>
					<option value="FIELD">Field</option>
					<option value="UNION">Union</option>
				</select>
				<select
					v-model="filters.status"
					class="px-3 py-2 border rounded"
				>
					<option value="">All Status</option>
					<option value="ACTIVE">Active</option>
					<option value="INACTIVE">Inactive</option>
				</select>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead>
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Name
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Classification
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Rate
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
							v-for="employee in filteredEmployees"
							:key="employee.id"
							class="hover:bg-gray-50"
						>
							<td class="px-6 py-4">
								{{ employee.name }}
							</td>
							<td class="px-6 py-4">
								<span
									:class="
										getClassificationClass(
											employee.classification
										)
									"
								>
									{{ employee.classification }}
								</span>
							</td>
							<td class="px-6 py-4">
								{{
									employee.hourlyRate
										? `$${employee.hourlyRate}/hr`
										: "-"
								}}
							</td>
							<td class="px-6 py-4">
								<span
									:class="getStatusClass(employee.status)"
									class="px-2 py-1 rounded-full text-xs"
								>
									{{ employee.status }}
								</span>
							</td>
							<td class="px-6 py-4 text-right">
								<button
									@click="openEditEmployee(employee)"
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
import { useEmployeeStore } from "../../store/employee";

const employeeStore = useEmployeeStore();
const filters = ref({
	search: "",
	classification: "",
	status: "",
});

onMounted(() => {
	employeeStore.fetchEmployees();
});

const filteredEmployees = computed(() => {
	return employeeStore.employees.filter((employee) => {
		const matchesSearch =
			!filters.value.search ||
			employee.name
				.toLowerCase()
				.includes(filters.value.search.toLowerCase());
		const matchesClassification =
			!filters.value.classification ||
			employee.classification === filters.value.classification;
		const matchesStatus =
			!filters.value.status || employee.status === filters.value.status;

		return matchesSearch && matchesClassification && matchesStatus;
	});
});

const getClassificationClass = (classification: string) => {
	const classes = {
		OFFICE: "text-purple-600",
		FIELD: "text-blue-600",
		UNION: "text-green-600",
	};
	return classes[classification] || "";
};

const getStatusClass = (status: string) => {
	return status === "ACTIVE"
		? "bg-green-100 text-green-800"
		: "bg-gray-100 text-gray-800";
};

const openNewEmployee = () => {
	// TODO: Implement new employee modal/form
};

const openEditEmployee = (employee) => {
	// TODO: Implement edit employee modal/form
};
</script>
