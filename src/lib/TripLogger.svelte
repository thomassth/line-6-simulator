<script lang="ts">
    import { onMount } from "svelte";
    import { line6RedLights, line6EastwardStops } from "./data/line-6";
    import {
        line5RedLights,
        line5WestwardStops,
        line5EastwardStops,
    } from "./data/line-5";
    let selectedLine = $state<string>("line-5-w");
    const redLights = $derived(
        selectedLine === "line-6" ? line6RedLights : line5RedLights,
    );
    const stops = $derived.by(() => {
        if (selectedLine === "line-5-w") {
            return line5WestwardStops;
        }
        if (selectedLine === "line-6") {
            return line6EastwardStops;
        }
        if (selectedLine === "line-5-e") {
            return line5EastwardStops;
        }
        return line5WestwardStops;
    });

    const allLocations = $derived(
        Object.entries(stops).map(([name, distance]) => ({
            name,
            distance: distance as number,
        })),
    );

    const storedTime = $state({
        ...allLocations
            .map((e) => e.name)
            .reduce((acc, curr) => ((acc[curr] = ""), acc), {}),
    });

    const tripStats = $derived.by(() => {
        const timedStops = allLocations.filter((stop) => storedTime[stop.name]);
        if (timedStops.length < 2) {
            return { time: 0, distance: 0 };
        }

        const firstStop = timedStops[0];
        const lastStop = timedStops[timedStops.length - 1];

        const firstTime = storedTime[firstStop.name];
        const lastTime = storedTime[lastStop.name];

        const [firstHours, firstMinutes] = firstTime.split(":").map(Number);
        const firstTimeInMinutes = firstHours * 60 + firstMinutes;

        const [lastHours, lastMinutes] = lastTime.split(":").map(Number);
        const lastTimeInMinutes = lastHours * 60 + lastMinutes;

        const time = lastTimeInMinutes - firstTimeInMinutes;
        const distance = lastStop.distance - firstStop.distance;

        return { time, distance };
    });

    const recordedTripTime = $derived(tripStats.time);

    const recordedDistance = $derived(tripStats.distance);

    const recordedAverageSpeed = $derived(
        recordedTripTime > 0
            ? recordedDistance / 1000 / (recordedTripTime / 60)
            : 0,
    );

    onMount(() => {
        const storedTimeLS = localStorage.getItem("storedTime");
        if (storedTimeLS) {
            const object = JSON.parse(storedTimeLS);
            for (const key in object) {
                if (object.hasOwnProperty(key)) {
                    storedTime[key] = object[key];
                }
            }
        }
    });

    $effect(() => {
        localStorage.setItem("storedTime", JSON.stringify(storedTime));
    });

    const tripData = $derived.by(() => {
        let lastTime = 0;
        let totalTime = 0;
        const data = [];
        for (const stop of allLocations) {
            const time = storedTime[stop.name];
            if (!time) {
                data.push({
                    name: stop.name,
                    time: "",
                    timeBetween: "",
                    totalTime: "",
                    avgSpeed: "",
                });
                continue;
            }

            const [hours, minutes] = time.split(":").map(Number);
            const timeInMinutes = hours * 60 + minutes;

            if (lastTime !== 0) {
                const timeBetween = timeInMinutes - lastTime;
                totalTime += timeBetween;
                data.push({
                    name: stop.name,
                    time: time,
                    timeBetween: `${timeBetween} min`,
                    totalTime: `${totalTime} min`,
                    avgSpeed: `${(stop.distance / 1000 / (totalTime / 60)).toFixed(2)} km/h`,
                });
            } else {
                data.push({
                    name: stop.name,
                    time: time,
                    timeBetween: "",
                    totalTime: "",
                    avgSpeed: "",
                });
            }
            lastTime = timeInMinutes;
        }
        return data;
    });
</script>

<main>
    <h1>TTC LRT Trip Time Simulator</h1>
    <h2>Average speed: {recordedAverageSpeed.toPrecision(4)} km/h</h2>
    <div class="container">
        <form onsubmit={(e) => e.preventDefault()}>
            <select id="line-data" required bind:value={selectedLine}>
                <option value="line-5-e">Line 5 Eglinton (To Kennedy)</option>
                <option value="line-5-w"
                    >Line 5 Eglinton (To Mount Dennis)</option
                >
                <option value="line-6">Line 6 Finch West</option>
            </select>
        </form>

        <table>
            <thead>
                <tr>
                    <th>Station</th>
                    <th>Arrival Time</th>
                    <th>Time Between Stations</th>
                    <th>Total Time</th>
                    <th>Avg Speed</th>
                </tr>
            </thead>
            <tbody>
                {#each tripData as stop}
                    <tr>
                        <td>{stop.name}</td>
                        <td
                            ><input
                                type="time"
                                bind:value={storedTime[stop.name]}
                            /></td
                        >
                        <td>{stop.timeBetween}</td>
                        <td>{stop.totalTime}</td>
                        <td>{stop.avgSpeed}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</main>
