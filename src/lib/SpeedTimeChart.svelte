<script lang="ts">
import type { Chart } from "chart.js";
import { onDestroy, onMount } from "svelte";

interface ChartDataPoint {
	x: number;
	y: number;
	isTopSpeed?: boolean;
}
const { data }: { data: ChartDataPoint[] } = $props();

let chartCanvas: HTMLCanvasElement;
let chartInstance: Chart | null = null;

async function initializeOrUpdateChart() {
	const { Chart: ChartJS, registerables } = await import("chart.js/auto");
	ChartJS.register(...registerables);

	if (chartCanvas) {
		const chartData = data.map((point) => ({
			...point,
			x: point.x / 60,
		}));

		if (chartInstance) {
			chartInstance.data.datasets[0].data = chartData;
			chartInstance.update();
		} else {
			chartInstance = new ChartJS(chartCanvas, {
				type: "line",
				data: {
					datasets: [
						{
							label: "Speed (km/h)",
							data: chartData,
							fill: true,
							pointRadius: 0,
							segment: {
								borderColor: (ctx) =>
									ctx.p1.raw.isTopSpeed === false
										? "rgba(255, 99, 132, 1)"
										: "#4a90e2",
								backgroundColor: (ctx) =>
									ctx.p1.raw.isTopSpeed === false
										? "rgba(255, 99, 132, 0.2)"
										: "rgba(74, 144, 226, 0.2)",
							},
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						x: {
							type: "linear",
							title: {
								display: true,
								text: "Time (minutes)",
							},
						},
						y: {
							title: { display: true, text: "Speed (km/h)" },
							min: 0,
							max: 60,
						},
					},
				},
			});
		}
	}
}

$effect(() => {
	if (chartCanvas && data) {
		initializeOrUpdateChart();
	}
});

onMount(() => {
	initializeOrUpdateChart();
});

onDestroy(() => {
	if (chartInstance) {
		chartInstance.destroy();
	}
});
</script>

<div
    class="chart-container"
    style="position: relative; height: 400px; width: 100%;"
>
    <canvas bind:this={chartCanvas}></canvas>
</div>
