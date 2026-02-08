<script lang="ts">
    const speedThresholds = [15, 20, 25];

    const thresholdsInLegend = $derived([0, ...speedThresholds, 50]);

    interface Result {
        station: string;
        time: number;
        distance: number;
    }

    const {
        stops,
        results,
        selectedLocations,
        selectedLine,
    }: {
        stops: Record<string, number>;
        results: Result[];
        selectedLocations: string[];
        selectedLine: string;
    } = $props();

    const allLocations = $derived(
        Object.entries(stops).map(([name, distance]) => ({
            name,
            distance: distance as number,
        })),
    );

    const totalDistance = $derived(
        allLocations.length > 0
            ? allLocations[allLocations.length - 1].distance
            : 1,
    );

    const svgPadding = 50;
    const svgWidth = 1200;

    function getLocationX(distance: number) {
        if (selectedLine === "line-5") {
            return (
                svgPadding +
                (1 - distance / totalDistance) * (svgWidth - svgPadding * 2)
            );
        }
        return (
            svgPadding +
            (distance / totalDistance) * (svgWidth - svgPadding * 2)
        );
    }

    const speedToColor = (speed: number) => {
        const speedClass = speedThresholds.findIndex(
            (threshold) => speed < threshold,
        );

        const colorVale = `oklch(0.7 0.3 ${(speedClass === -1 ? speedThresholds.length : speedClass) * 50 + 40})`;

        return colorVale;
    };

    //   const speedToColor = (speed: number) => {
    //       const minSpeed = thresholdsInLegend[0];
    //       const maxSpeed = thresholdsInLegend[thresholdsInLegend.length - 1];
    //       const speedRange = maxSpeed - minSpeed;
    //       if (speedRange === 0) {
    //           return "rgb(0, 255, 0)"; // Default to green if no range
    //       }

    //       const normalizedSpeed = Math.max(
    //           0,
    //           Math.min(1, (speed - minSpeed) / speedRange),
    //       );

    //       // Linear interpolation between red, yellow, and green
    //       let r, g, b;
    //       if (normalizedSpeed < 0.5) {
    //           // Red to Yellow
    //           r = 255;
    //           g = Math.round(255 * (normalizedSpeed * 2));
    //           b = 0;
    //       } else {
    //           // Yellow to Green
    //           r = Math.round(255 * (2 * (1 - normalizedSpeed)));
    //           g = 255;
    //           b = 0;
    //       }

    //       return `rgb(${r}, ${g}, ${b})`;
    //   };

    let coloredSegments = $derived.by(() => {
        if (results.length < 2) return [];

        const segments = [];
        const locations =
            selectedLine === "line-5"
                ? [...allLocations].reverse()
                : allLocations;

        // Iterate over each visual segment between all stations
        for (let i = 0; i < locations.length - 1; i++) {
            const fromLocation = locations[i];
            const toLocation = locations[i + 1];

            // Find the simulation segment that contains this visual segment
            let fromSim = null;
            let toSim = null;

            for (let j = 0; j < results.length - 1; j++) {
                if (
                    results[j].distance <= fromLocation.distance &&
                    results[j + 1].distance >= toLocation.distance
                ) {
                    fromSim = results[j];
                    toSim = results[j + 1];
                    break;
                }
            }

            if (fromSim && toSim) {
                const distance = toSim.distance - fromSim.distance;
                const time = toSim.time - fromSim.time;
                const speed = time > 0 ? distance / 1000 / (time / 3600) : 0;

                segments.push({
                    from: fromLocation,
                    to: toLocation,
                    color: speedToColor(speed),
                    minutes: time / 60,
                });
            } else {
                segments.push({
                    from: fromLocation,
                    to: toLocation,
                    color: "lightgrey", // No data for this segment
                });
            }
        }
        return segments;
    });
</script>

<div class="route-diagram">
    <div class="svg-container">
        <svg width={svgWidth} height="150">
            <!-- Main line -->
            <line
                x1={svgPadding}
                y1="50"
                x2={svgWidth - svgPadding}
                y2="50"
                stroke="lightgrey"
                stroke-width="2"
            />
            <!-- Colored Segments -->
            {#each coloredSegments as segment}
                <line
                    x1={getLocationX(segment.from.distance)}
                    y1="50"
                    x2={getLocationX(segment.to.distance)}
                    y2="50"
                    stroke={segment.color}
                    stroke-width="12"
                />
                {#if segment.minutes}
                    {@const x =
                        (getLocationX(segment.from.distance) +
                            getLocationX(segment.to.distance)) /
                        2}
                    <!-- Background of text -->
                    <rect
                        x={x - 15}
                        y="44"
                        width="30"
                        height="14"
                        fill="rgba(255,255,255,0.5)"
                        rx="2"
                        ry="2"
                    />
                    <!-- Text -->
                    <text {x} y="54" text-anchor="middle" font-size="10">
                        {segment.minutes.toFixed(1)}
                    </text>
                {/if}
            {/each}
            <!-- Stations -->
            {#each allLocations as location, i}
                {@const isSelected = selectedLocations.includes(location.name)}
                {@const x = getLocationX(location.distance)}
                <g transform={`translate(${x}, 50)`}>
                    {#if isSelected}
                        <circle
                            cx="0"
                            cy="0"
                            r="6"
                            fill="white"
                            stroke="black"
                            stroke-width="2"
                        />
                    {:else}
                        <path d="M -5 -5 L 5 0 L -5 5 z" fill="black" />
                    {/if}
                    <text
                        y="15"
                        x="-10"
                        transform="rotate(-45, 0, 0)"
                        text-anchor="end"
                        font-size="10"
                        >{location.name}
                    </text>
                </g>
            {/each}
        </svg>
    </div>
    <div class="legend">
        <p>Est speed (km/h)</p>
        <div class="legend-bar">
            {#each thresholdsInLegend as threshold, i}
                {#if i < thresholdsInLegend.length - 1}
                    {@const from = threshold}
                    {@const to = thresholdsInLegend[i + 1]}
                    <div
                        class="legend-chunk"
                        style="background-color: {speedToColor(
                            (from + to) / 2,
                        )}"
                    ></div>
                    {#if i < thresholdsInLegend.length - 2}
                        <span class="legend-value">{to}</span>
                    {/if}
                {/if}
            {/each}
        </div>
    </div>
</div>

<style>
    .route-diagram {
        background: white;
        width: 100%;
        overflow-x: auto;

        .svg-container {
            overflow-x: scroll;
            padding: 0 1em;
        }
    }
    .legend {
        display: flex;
        flex-direction: column;
        padding: 1em;
        color: black;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 1rem;
        font-size: 12px;
    }
    .legend-bar {
        display: grid;
        grid-template-columns: 1fr 2em 1fr 2em 1fr 2em 1fr;
        align-items: center;
        margin: 0 1rem;
        max-width: 20em;
        width: 100%;
    }
    .legend-chunk {
        height: 20px;
        border-radius: 10px;
    }
    .legend-value {
        padding: 0 5px;
    }
</style>
