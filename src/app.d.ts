// See https://svelte.dev/docs/kit/types#app.d.ts

import type { IDToken, UserInfoResponse } from 'oauth4webapi';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: (UserInfoResponse | IDToken | null) & { groups?: Array<string>; roles?: Array<string> };
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
