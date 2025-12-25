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

    const markdownOutput = $derived.by(() => {
        const header = [
            "| Station | Arrival Time | Total Distance |",
            "|--------:|--------------|----------------|",
        ];
        const body = results.map(
            (r) => `| ${r.station} | ${formatTime(r.time)} | ${r.distance} m |`,
        );
        return [...header, ...body].join("\n");
    });
</script>

<div class="output-section">
    <h2>Markdown</h2>
    <textarea readonly value={markdownOutput}></textarea>
</div>

<style>
    .output-section {
        margin-top: 2rem;
    }

    h2 {
        /*color: var(--primary-color);*/
        border-bottom: 2px solid var(--secondary-color);
        padding-bottom: 0.5rem;
        margin-top: 1.5rem;
    }

    textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--light-gray);
        border-radius: var(--border-radius);
        font-size: 1rem;
        transition: box-shadow 0.2s;
        height: 200px;
        resize: vertical;
        /*background: #f8f9fa;*/
        /*color: #333;*/
    }

    textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.25);
    }
</style>
