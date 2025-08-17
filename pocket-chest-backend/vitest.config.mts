import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					// Default test environment variables - can be overridden in individual tests
					vars: {
						REQUIRE_TOTP: 'false',
						JWT_SECRET: 'test-jwt-secret-for-vitest-only',
					},
				},
			},
		},
	},
});
