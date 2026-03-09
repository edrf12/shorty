import { authorize, exchange, refresh, userinfo, introspect } from '$lib/server/auth';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { date } from 'better-auth';
import type { CookieSerializeOptions } from 'cookie';

const cookieOptions: CookieSerializeOptions & { path: string } = {
	path: '/',
	sameSite: 'lax'
};

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies, locals } = event;

	// Define protected route patterns
	const api_route = event.route.id?.includes('api') ?? false;
	const protected_route = event.route.id?.includes('(auth)') ?? false;

	// OAuth Callback (Works anywhere)
	const code = url.searchParams.get('code');
	if (code) {
		const code_verifier = cookies.get('code_verifier');
		const nonce = cookies.get('nonce');
		cookies.delete('code_verifier', cookieOptions);
		cookies.delete('nonce', cookieOptions);

		if (code_verifier) {
			const { token, claims } = await exchange(code_verifier, nonce, url);

			cookies.set('shorts_authorization', token.access_token, cookieOptions);
			if (token.refresh_token) {
				cookies.set('shorts_refresh', token.refresh_token, cookieOptions);
			}

			locals.user = claims;

			const redirectTo = cookies.get('return_to') || '/d';
			cookies.delete('return_to', cookieOptions);

			throw redirect(301, redirectTo);
		}
	}

	// Enforce Authorization
	if (protected_route) {
		// Validate and refresh session
		const accessToken =
			event.request.headers.get('Authorization')?.replace('Bearer ', '') ||
			cookies.get('shorts_authorization');
		const refreshToken = cookies.get('shorts_refresh');
		if (accessToken) {
			const response = await introspect(accessToken);
			const should_refresh = response.exp
				? response.exp - Math.floor(Date.now() / 1000) < 90
				: false;

			if (!should_refresh && response && response.active) {
				// If token is active get userinfo
				locals.user = await userinfo(accessToken);
				return await resolve(event);
			} else if (refreshToken) {
				// Handle session refresh
				try {
					const { token, claims } = await refresh(refreshToken);

					if (token.access_token) {
						cookies.set('shorts_authorization', token.access_token, cookieOptions);
					}

					if (token.refresh_token) {
						cookies.set('shorts_refresh', token.refresh_token, cookieOptions);
					}

					locals.user = claims;
					return await resolve(event);
				} catch {
					cookies.delete('shorts_authorization', cookieOptions);
					cookies.delete('shorts_refresh', cookieOptions);
				}
			}
		}

		// User is not authorized, we will deal with that below

		// API Routes return 401
		if (api_route) {
			return new Response('Unauthorized', { status: 401 });
		}

		// Prompt user for authorization

		// Store current URL to return back after successful login
		cookies.set('return_to', url.pathname, cookieOptions);

		const {
			code_verifier,
			nonce,
			url: authUrl
		} = await authorize(url.origin, 'openid email profile groups');

		// Set cookies needed for the callback
		cookies.set('code_verifier', code_verifier, cookieOptions);
		if (nonce) {
			cookies.set('nonce', nonce, cookieOptions);
		}

		// Send user to the authorization provider
		throw redirect(302, authUrl);
	}

	return resolve(event);
};
