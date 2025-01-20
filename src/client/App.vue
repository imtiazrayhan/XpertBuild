<template>
	<div class="min-h-screen bg-gray-100">
		<nav class="bg-white shadow">
			<div class="max-w-7xl mx-auto px-4">
				<div class="flex justify-between items-center h-16">
					<router-link to="/" class="text-xl font-bold text-blue-600">
						XpertBuild
					</router-link>
					<nav class="flex space-x-8">
						<router-link
							to="/"
							class="text-gray-600 hover:text-gray-900"
							>Dashboard</router-link
						>
						<router-link
							to="/projects"
							class="text-gray-600 hover:text-gray-900"
							>Projects</router-link
						>
						<router-link
							to="/employees"
							class="text-gray-600 hover:text-gray-900"
							>Employees</router-link
						>
						<router-link
							to="/expenses"
							class="text-gray-600 hover:text-gray-900"
							>Expenses</router-link
						>
					</nav>
				</div>
			</div>
		</nav>
		<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
			<router-view></router-view>
		</main>
	</div>
</template>
