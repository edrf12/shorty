<script lang="ts">
	// import mne from 'mnemonic-browser';
	import type { PageProps } from './$types';
	import type { Link } from '$lib/server/db';
	let { data }: PageProps = $props();

	let original_url: string | undefined = $state();
	let short_url: string | undefined = $state();

	let shortened_url: Link | undefined = $state();

	async function shorten() {
		const body = {
			original_url,
			short_url
		};
		const response = await fetch('/api/links', { method: 'POST', body: JSON.stringify(body) });

		if (response.ok) {
			const data: Link = await response.json();
			shortened_url = data;
		}
	}
</script>

<h1>Hello, world</h1>
<h2>Dashboard soon™</h2>

<p>Welcome, {data.user.preferred_username}</p>

<fieldset>
	<legend>Shorten a URL</legend>
	<input type="text" placeholder="Original URL" bind:value={original_url} id="original_url" />
	{#if !data.user.roles || data.user.roles.includes('link:custom')}
		<br /><br />
		<input type="text" placeholder="Short URL" bind:value={short_url} id="short_url" />
	{/if}
	<br /><br />
	<button onclick={shorten}> Shorten </button>
	{#if shortened_url}
		<p>{window.location.origin}/{shortened_url.short_url}</p>
		<button
			onclick={() =>
				navigator.clipboard.writeText(`${window.location.origin}/${shortened_url!.short_url}`)}
			>Copy</button
		>
	{/if}
</fieldset>
