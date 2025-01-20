<template>
	<div>
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-2xl font-bold">Expenses</h2>
			<button
				@click="openNewExpense"
				class="bg-primary-600 text-white px-4 py-2 rounded"
			>
				New Expense
			</button>
		</div>

		<div class="bg-white shadow rounded-lg">
			<div class="p-4 border-b grid grid-cols-1 md:grid-cols-4 gap-4">
				<input
					v-model="filters.search"
					type="text"
					placeholder="Search expenses..."
					class="px-3 py-2 border rounded"
				/>
				<select v-model="filters.type" class="px-3 py-2 border rounded">
					<option value="">All Types</option>
					<option value="GENERAL">General</option>
					<option value="PROJECT">Project</option>
				</select>
				<input
					v-model="filters.dateFrom"
					type="date"
					class="px-3 py-2 border rounded"
				/>
				<input
					v-model="filters.dateTo"
					type="date"
					class="px-3 py-2 border rounded"
				/>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead>
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Date
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Description
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Type
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Category
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Amount
							</th>
							<th class="px-6 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						<tr
							v-for="expense in filteredExpenses"
							:key="expense.id"
							class="hover:bg-gray-50"
						>
							<td class="px-6 py-4">
								{{ formatDate(expense.date) }}
							</td>
							<td class="px-6 py-4">{{ expense.description }}</td>
							<td class="px-6 py-4">
								<span
									:class="getTypeClass(expense.type)"
									class="px-2 py-1 rounded-full text-xs"
								>
									{{ expense.type }}
								</span>
							</td>
							<td class="px-6 py-4">{{ expense.category }}</td>
							<td class="px-6 py-4">
								${{ formatCurrency(expense.amount) }}
							</td>
							<td class="px-6 py-4 text-right">
								<button
									@click="openEditExpense(expense)"
									class="text-gray-600 hover:text-primary-600"
								>
									Edit
								</button>
							</td>
						</tr>
					</tbody>
					<tfoot>
						<tr>
							<td
								colspan="4"
								class="px-6 py-4 text-right font-medium"
							>
								Total:
							</td>
							<td class="px-6 py-4 font-medium">
								${{ formatCurrency(totalAmount) }}
							</td>
							<td></td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useExpenseStore } from "../../store/expense";

const expenseStore = useExpenseStore();
const filters = ref({
	search: "",
	type: "",
	dateFrom: "",
	dateTo: "",
});

onMounted(() => {
	expenseStore.fetchExpenses();
});

const filteredExpenses = computed(() => {
	return expenseStore.expenses.filter((expense) => {
		const matchesSearch =
			!filters.value.search ||
			expense.description
				.toLowerCase()
				.includes(filters.value.search.toLowerCase());
		const matchesType =
			!filters.value.type || expense.type === filters.value.type;
		const matchesDateFrom =
			!filters.value.dateFrom ||
			new Date(expense.date) >= new Date(filters.value.dateFrom);
		const matchesDateTo =
			!filters.value.dateTo ||
			new Date(expense.date) <= new Date(filters.value.dateTo);

		return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
	});
});

const totalAmount = computed(() => {
	return filteredExpenses.value.reduce(
		(sum, expense) => sum + expense.amount,
		0
	);
});

const formatCurrency = (value: number) => {
	return value.toLocaleString("en-US", { minimumFractionDigits: 2 });
};

const formatDate = (date: string) => {
	return new Date(date).toLocaleDateString();
};

const getTypeClass = (type: string) => {
	return type === "PROJECT"
		? "bg-blue-100 text-blue-800"
		: "bg-gray-100 text-gray-800";
};

const openNewExpense = () => {
	// TODO: Implement new expense modal/form
};

const openEditExpense = (expense) => {
	// TODO: Implement edit expense modal/form
};
</script>
