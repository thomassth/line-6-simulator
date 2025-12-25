<script lang="ts">
    import { expressSet, ttcDecSet, ttcSet } from "./data/preset";
    import { redLights, stops } from "./data/stops";
    import HtmlTable from "./HtmlTable.svelte";
    import MarkdownOutput from "./MarkdownOutput.svelte";
    import SpeedTimeChart from "./SpeedTimeChart.svelte";

    interface Location {
        name: string;
        distance: number;
    }

    interface Stop extends Location {
        type: "station" | "redlight";
    }

    interface Result {
        station: string;
        time: number;
        distance: number;
    }

    interface ChartDataPoint {
        x: number;
        y: number;
        isTopSpeed?: boolean;
    }

    let allLocations = $state<Location[]>([]);
    let selectedLocations = $state<string[]>([]);
    let topSpeed = $state(60);
    let accelTime = $state(20);
    let decelTime = $state(15);
    let stationStopTime = $state(30);
    let redLightStopTime = $state(20);
    let stopAtRedLights = $state(false);

    $effect(() => {
        try {
            const locationsData = stops;
            const loadedLocations = Object.entries(locationsData).map(
                ([name, distance]) => ({
                    name,
                    distance: distance as number,
                }),
            );
            allLocations = loadedLocations;
            selectedLocations = loadedLocations
                .filter((loc) => expressSet.stations?.includes(loc.name))
                .map((loc) => loc.name);
        } catch (error) {
            console.error("Failed to load locations:", error);
        }
    });

    const patternSet = new Map([
        ["ttc", ttcSet],
        ["ttc-dec", ttcDecSet],
        ["express", expressSet],
    ]);

    function applyPattern(pattern: string) {
        const set = patternSet.get(pattern);
        if (!set) return;
        if (set.stations) {
            selectedLocations = allLocations
                .filter((loc) => set.stations?.includes(loc.name))
                .map((loc) => loc.name);
        } else {
            selectedLocations = allLocations.map((loc) => loc.name);
        }
        stopAtRedLights = set.stopAtRedLights ?? stopAtRedLights;
        redLightStopTime = set.redLightStopTime ?? redLightStopTime;
        topSpeed = set.topSpeed ?? topSpeed;
        stationStopTime = set.stationStopTime ?? stationStopTime;
    }

    function simulateTrip(
        locations: Location[],
        topSpeedKmH: number,
        accelTime: number,
        decelTime: number,
        stationStopTime: number,
        redLightStopTime: number,
        shouldStopAtRedLights: boolean,
        redLightDistances: number[],
    ): { results: Result[]; chartData: ChartDataPoint[] } {
        const topSpeedMs = (topSpeedKmH * 1000) / 3600;
        const accelRate = topSpeedMs / accelTime;
        const decelRate = topSpeedMs / decelTime;
        const accelDist = 0.5 * accelRate * accelTime ** 2;
        const decelDist = 0.5 * decelRate * decelTime ** 2;
        const minDist = accelDist + decelDist;

        const stationStops: Stop[] = locations.map((loc) => ({
            ...loc,
            type: "station",
        }));
        const redLightStops: Stop[] = shouldStopAtRedLights
            ? redLightDistances.map((dist) => ({
                  name: "Red Light",
                  distance: dist,
                  type: "redlight",
              }))
            : [];

        const allStops = [...stationStops, ...redLightStops]
            .slice()
            .sort((a, b) => a.distance - b.distance)
            .filter(
                (stop, index, self) =>
                    index ===
                    self.findIndex((s) => s.distance === stop.distance),
            );

        const newResults: Result[] = [];
        const newChartData: ChartDataPoint[] = [{ x: 0, y: 0 }];
        let currentTime = 0;
        let lastDist = 0;
        const curvePoints = 10;

        allStops.forEach((stop, index) => {
            const segmentDist = stop.distance - lastDist;
            lastDist = stop.distance;
            let travelTime = 0;
            const isTopSpeed = segmentDist >= minDist;

            if (segmentDist >= minDist) {
                const cruiseDist = segmentDist - (accelDist + decelDist);
                const cruiseTime = cruiseDist / topSpeedMs;
                travelTime = accelTime + cruiseTime + decelTime;

                for (let i = 1; i <= curvePoints; i++) {
                    const t = (i / curvePoints) * accelTime;
                    newChartData.push({
                        x: currentTime + t,
                        y:
                            topSpeedKmH *
                            Math.sin((Math.PI / 2) * (t / accelTime)),
                        isTopSpeed,
                    });
                }

                const cruiseEndTime = currentTime + accelTime + cruiseTime;
                newChartData.push({
                    x: cruiseEndTime,
                    y: topSpeedKmH,
                    isTopSpeed,
                });

                const decelStartTime = cruiseEndTime;
                for (let i = 1; i <= curvePoints; i++) {
                    const t = (i / curvePoints) * decelTime;
                    newChartData.push({
                        x: decelStartTime + t,
                        y:
                            topSpeedKmH *
                            Math.cos((Math.PI / 2) * (t / decelTime)),
                        isTopSpeed,
                    });
                }
            } else if (segmentDist > 0) {
                const vMax = Math.sqrt(
                    (2 * segmentDist * accelRate * decelRate) /
                        (accelRate + decelRate),
                );
                const t1 = vMax / accelRate;
                const t2 = vMax / decelRate;
                travelTime = t1 + t2;
                const vMaxKmH = vMax * 3.6;

                for (let i = 1; i <= curvePoints; i++) {
                    const t = (i / curvePoints) * t1;
                    newChartData.push({
                        x: currentTime + t,
                        y: vMaxKmH * Math.sin((Math.PI / 2) * (t / t1)),
                        isTopSpeed,
                    });
                }

                const decelStartTime = currentTime + t1;
                for (let i = 1; i <= curvePoints; i++) {
                    const t = (i / curvePoints) * t2;
                    newChartData.push({
                        x: decelStartTime + t,
                        y: vMaxKmH * Math.cos((Math.PI / 2) * (t / t2)),
                        isTopSpeed,
                    });
                }
            }

            currentTime += travelTime;
            if (stop.type === "station") {
                newResults.push({
                    station: stop.name,
                    time: currentTime,
                    distance: stop.distance,
                });
            }
            newChartData.push({ x: currentTime, y: 0, isTopSpeed });

            const stopTime =
                stop.type === "redlight" ? redLightStopTime : stationStopTime;
            if (stopTime > 0 && index !== 0 && index < allStops.length - 1) {
                const stopStartTime = currentTime;
                currentTime += stopTime;
                newChartData.push({ x: stopStartTime, y: 0 });
                newChartData.push({ x: currentTime, y: 0 });
            }
        });

        return { results: newResults, chartData: newChartData };
    }

    const simulationOutput = $derived.by(() => {
        if (allLocations.length === 0) {
            return { results: [], chartData: [] };
        }
        const checkedLocations = allLocations.filter((loc) =>
            selectedLocations.includes(loc.name),
        );
        return simulateTrip(
            checkedLocations,
            topSpeed,
            accelTime,
            decelTime,
            stationStopTime,
            redLightStopTime,
            stopAtRedLights,
            redLights,
        );
    });

    const results = $derived(simulationOutput.results);
    const chartData = $derived(simulationOutput.chartData);
</script>

<main>
    <h1>Line 6 Trip Time Simulator</h1>
    <div class="container">
        <form onsubmit={(e) => e.preventDefault()}>
            <div class="locations-container">
                <h2>Select Locations</h2>
                <div class="controls">
                    <button onclick={() => applyPattern("ttc")}
                        >TTC Pattern (First day)</button
                    >
                    <button onclick={() => applyPattern("ttc-dec")}
                        >TTC Pattern (Late Dec)</button
                    >
                    <button onclick={() => applyPattern("express")}
                        >Express Streetcar</button
                    >
                </div>
                <div class="locations-grid">
                    {#each allLocations as location (location.name)}
                        <div class="location-item">
                            <input
                                type="checkbox"
                                id={location.name}
                                bind:group={selectedLocations}
                                value={location.name}
                            />
                            <label for={location.name}>{location.name}</label>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="parameters">
                <h2>Parameters</h2>
                <label for="topSpeed">Top speed (km/h)</label>
                <input
                    id="topSpeed"
                    type="number"
                    bind:value={topSpeed}
                    step="0.1"
                />

                <label for="accelTime">Acceleration time (s)</label>
                <input
                    id="accelTime"
                    type="number"
                    bind:value={accelTime}
                    step="0.1"
                />

                <label for="decelTime">Deceleration time (s)</label>
                <input
                    id="decelTime"
                    type="number"
                    bind:value={decelTime}
                    step="0.1"
                />

                <label for="stationStopTime"
                    >Stopping time per station (s)</label
                >
                <input
                    id="stationStopTime"
                    type="number"
                    bind:value={stationStopTime}
                    step="0.1"
                />

                <div class="checkbox-container">
                    <input
                        id="stopAtRedLights"
                        type="checkbox"
                        bind:checked={stopAtRedLights}
                    />
                    <label for="stopAtRedLights">Stop at red lights</label>
                </div>

                {#if stopAtRedLights}
                    <label for="redLightStopTime">Red light stop time (s)</label
                    >
                    <input
                        id="redLightStopTime"
                        type="number"
                        bind:value={redLightStopTime}
                        step="0.1"
                    />
                {/if}
            </div>
        </form>

        <div class="results">
            <SpeedTimeChart data={chartData} />
            <HtmlTable {results} />
            <MarkdownOutput {results} />
        </div>
    </div>
</main>

<style>
    :root {
        --primary-color: #4a90e2;
        --secondary-color: #d13438;
        --background-color: #f8f9fa;
        --card-background: #ffffff;
        --text-color: #333;
        --light-gray: #e9ecef;
        --border-radius: 8px;
        --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    main {
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
            Arial, sans-serif;
        /*background-color: var(--background-color);*/
        padding: 2rem;
    }

    h1 {
        text-align: center;
        margin-bottom: 2rem;
        font-size: 2.5rem;
    }

    h2 {
        border-bottom: 2px solid var(--secondary-color);
        padding-bottom: 0.5rem;
        margin-top: 1.5rem;
    }

    .container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    @media (min-width: 992px) {
        .container {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    form,
    .results {
        padding: 2rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
    }

    .locations-container .controls {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .locations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
        max-height: 400px;
        overflow-y: auto;
        padding: 1rem;
        border: 1px solid var(--light-gray);
        border-radius: var(--border-radius);
    }

    .location-item {
        display: flex;
        align-items: center;
        /*background: #fdfdfd;*/
        border: 1px solid var(--background-color);
        padding: 0.5rem;
        border-radius: 4px;
    }

    .parameters {
        margin-top: 2rem;
    }

    label {
        display: block;
        margin-top: 1.5rem;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }

    input[type="number"] {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--light-gray);
        border-radius: var(--border-radius);
        font-size: 1rem;
        transition: box-shadow 0.2s;
    }

    input[type="number"]:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.25);
    }

    .checkbox-container {
        display: flex;
        align-items: center;
        margin-top: 1.5rem;
    }

    .checkbox-container input[type="checkbox"] {
        margin-right: 0.5rem;
    }

    .checkbox-container label {
        margin: 0;
        font-weight: normal;
    }

    button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-size: 1rem;
        transition:
            background-color 0.2s,
            box-shadow 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    button:hover {
        background-color: #357abd;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    button:active {
        background-color: #2c6aa6;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }
</style>
