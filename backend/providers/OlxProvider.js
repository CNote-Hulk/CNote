const MarketplaceProvider = require('./MarketplaceProvider');

class OlxProvider extends MarketplaceProvider {
	constructor(credentials = {}) {
		super(credentials);

		this.apiBase = 'https://api.olxgroup.com';
		this.authBase = 'https://www.olx.ro';

		this.clientId = process.env.OLX_CLIENT_ID;
		this.clientSecret = process.env.OLX_CLIENT_SECRET;
		this.redirectUri =
			process.env.OLX_REDIRECT_URI ||
			`${process.env.API_BASE_URL}/marketplace/olx/callback`;
	}

	// 🔐 OAuth URL (REAL FLOW)
	getAuthorizationUrl(state) {
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			state
		});

		return `${this.authBase}/crm/authorization/?${params.toString()}`;
	}

	// 🔐 Exchange code → token
	async authenticate(code) {
		const res = await fetch(`${this.apiBase}/oauth/v1/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization:
					'Basic ' +
					Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				code,
				redirect_uri: this.redirectUri
			})
		});

		if (!res.ok) {
			throw new Error(`OLX auth failed: ${res.statusText}`);
		}

		const data = await res.json();

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresAt: new Date(Date.now() + data.expires_in * 1000),
			providerUserId: data.user_id
		};
	}

	// 🔄 Refresh token
	async refreshToken(refreshToken) {
		const res = await fetch(`${this.apiBase}/oauth/v1/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization:
					'Basic ' +
					Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
			},
			body: JSON.stringify({
				grant_type: 'refresh_token',
				refresh_token: refreshToken
			})
		});

		const data = await res.json();

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresAt: new Date(Date.now() + data.expires_in * 1000)
		};
	}

	// 📦 Listings fetch (REAL API STYLE)
	async fetchListings(accessToken) {
		const res = await fetch(`${this.apiBase}/advert/v1`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!res.ok) {
			throw new Error(`OLX fetch listings failed: ${res.statusText}`);
		}

		const data = await res.json();

		return (data.data || []).map(item => this.normalizeData(item));
	}

	// 🔄 Normalize
	normalizeData(listing) {
		return {
			externalListingId: listing.id,
			title: listing.title,
			description: listing.description,
			price: listing.price?.value || null,
			currency: listing.price?.currency || 'RON',
			condition: listing.attributes?.condition || 'used',
			images: listing.photos?.map(p => p.url) || [],
			url: listing.url,
			status: listing.status,
			provider: 'olx'
		};
	}

	getProviderName() {
		return 'olx';
	}
}

module.exports = OlxProvider;