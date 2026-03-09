import * as oauth from 'oauth4webapi';
import { env } from '$env/dynamic/private';
import { update_username } from '$lib/server/db';

const config: oauth.AuthorizationServer = await oauth
	.discoveryRequest(new URL(env.OAUTH_URL), { algorithm: 'oidc' })
	.then((response) => oauth.processDiscoveryResponse(new URL(env.OAUTH_URL), response));

const client: oauth.Client = { client_id: env.CLIENT_ID };
const clientAuth = oauth.ClientSecretPost(env.CLIENT_SECRET);

export async function authorize(
	redirect_uri: string,
	scope: string
): Promise<{ code_verifier: string; nonce: string | undefined; url: URL }> {
	const code_verifier = oauth.generateRandomCodeVerifier();
	const code_challenge = await oauth.calculatePKCECodeChallenge(code_verifier);
	let nonce: string | undefined;

	const authorizationUrl = new URL(config.authorization_endpoint!);
	authorizationUrl.searchParams.set('client_id', client.client_id);
	authorizationUrl.searchParams.set('redirect_uri', redirect_uri);
	authorizationUrl.searchParams.set('response_type', 'code');
	authorizationUrl.searchParams.set('scope', scope);
	authorizationUrl.searchParams.set('code_challenge', code_challenge);
	authorizationUrl.searchParams.set('code_challenge_method', 'S256');

	if (config.code_challenge_methods_supported?.includes('S256') !== true) {
		nonce = oauth.generateRandomNonce();
		authorizationUrl.searchParams.set('nonce', nonce);
	}

	return { code_verifier, nonce, url: authorizationUrl };
}

export async function exchange(
	code_verifier: string,
	nonce: string | undefined,
	redirect_uri: URL
): Promise<{ token: oauth.TokenEndpointResponse; claims: oauth.IDToken }> {
	const params = oauth.validateAuthResponse(config, client, redirect_uri);

	const response = await oauth.authorizationCodeGrantRequest(
		config,
		client,
		clientAuth,
		params,
		redirect_uri.toString().split('?')[0],
		code_verifier
	);

	const token = await oauth.processAuthorizationCodeResponse(config, client, response, {
		expectedNonce: nonce,
		requireIdToken: true
	});
	const claims = oauth.getValidatedIdTokenClaims(token)!;

	// console.log('Access Token Response', token);
	// console.log('ID Token Claims', claims);

	// userinfo
	// const userinfo_req = await oauth.userInfoRequest(config, client, result.access_token);
	// const userinfo = await oauth.processUserInfoResponse(config, client, claims.sub, userinfo_req);
	// console.log('UserInfo Response', userinfo);
	return { token, claims };
}

export async function refresh(
	refresh_token: string
): Promise<{ token: oauth.TokenEndpointResponse; claims: oauth.IDToken }> {
	const response = await oauth.refreshTokenGrantRequest(config, client, clientAuth, refresh_token);
	const token = await oauth.processRefreshTokenResponse(config, client, response);
	const claims = oauth.getValidatedIdTokenClaims(token)!;
	return { token, claims };
}

export async function introspect(token: string): Promise<oauth.IntrospectionResponse> {
	const response = await oauth.introspectionRequest(config, client, clientAuth, token);
	const result = await oauth.processIntrospectionResponse(config, client, response);

	return result;
}

export async function userinfo(
	token: string
): Promise<oauth.UserInfoResponse & { groups: Array<string>; roles: Array<string> }> {
	const response = await oauth.userInfoRequest(config, client, token);
	const result: oauth.UserInfoResponse & { groups?: Array<string>; roles?: Array<string> } =
		await oauth.processUserInfoResponse(config, client, oauth.skipSubjectCheck, response);

	if (result.preferred_username) {
		update_username(result.sub, result.preferred_username);
	}

	// @ts-expect-error Fix for when we include the roles and groups claims
	return result;
}

export function check_role_user(
	sub: string,
	roles: Array<string> | undefined,
	role: string
): Array<string> | false | undefined {
	if (roles) {
		if (roles.includes(`${role}:all`)) {
			return undefined;
		} else {
			const users: string[] = roles
				.filter((check_role) => check_role.startsWith(role))
				.map((check_role) => check_role.split(':')[2] || sub);

			return users.length === 0 ? false : users;
		}
	} else {
		return [sub];
	}
}
