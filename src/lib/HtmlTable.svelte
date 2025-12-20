<script lang="ts">
interface Result {
	station: string;
	time: number;
	distance: number;
}
const { results }: { results: Result[] } = $props();

function formatTime(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}m ${s}s`;
}
</script>

<div class="output-section">
    <h2>HTML Table</h2>
    <div class="html-table-container">
        {#if results.length > 0}
            <table>
                <thead>
                    <tr>
                        <th>Station</th>
                        <th>Arrival Time</th>
                        <th>Total Distance</th>
                    </tr>
                </thead>
                <tbody>
                    {#each results as r (r.station)}
                        <tr>
                            <td>{r.station}</td>
                            <td>{formatTime(r.time)}</td>
                            <td>{r.distance} m</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {:else}
            <p>No results to display.</p>
        {/if}
    </div>
</div>

<style>
    h2 {
        color: var(--primary-color);
        border-bottom: 2px solid var(--secondary-color);
        padding-bottom: 0.5rem;
        margin-top: 1.5rem;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--light-gray);
    }

    th {
        background-color: #f2f2f2;
        position: sticky;
        top: 0;
    }

    tbody tr:nth-child(even) {
        background-color: #f9f9f9;
    }

    .html-table-container {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid var(--light-gray);
        border-radius: var(--border-radius);
        margin-top: 1rem;
    }
    p {
        text-align: center;
        padding: 1rem;
    }
</style>
