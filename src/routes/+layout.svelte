<script lang="ts">
    import favicon from "$lib/assets/favicon.svg";

    const { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<nav>
    <a href="https://tobus.ca">back to TO Bus</a>
    <a href="/line-6">line 6 simulator</a>
</nav>
{@render children()}

<style>
    body {
        background-color: #f0f0f0;
    }
</style>
