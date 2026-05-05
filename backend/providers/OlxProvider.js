/**
 * OLX Marketplace Provider
 * Handles OAuth flow, listing fetching, and data normalization for OLX
 */
const MarketplaceProvider = require('./MarketplaceProvider');

class OlxProvider extends MarketplaceProvider {
	constructor(credentials = {}) {
		super(credentials);
		this.baseUrl = 'https://api.olx.com';
		this.clientId = process.env.OLX_CLIENT_ID;
		this.clientSecret = process.env.OLX_CLIENT_SECRET;
		this.redirectUri = process.env.OLX_REDIRECT_URI || `${process.env.API_BASE_URL}/marketplace/olx/callback`;
	}

	/**
	 * Get OAuth authorization URL
	 * User should be redirected to this URL to authorize
	 * @returns {string} Authorization URL
	 */
	getAuthorizationUrl(state) {
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			state: state,
			scope: 'read:user read:listings'
		});
		return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for access token
	 * @param {string} code Authorization code from OAuth callback
	 * @returns {Promise<{accessToken, refreshToken, expiresAt, providerUserId}>}
	 */
	async authenticate(code) {
		try {
			const response = await fetch(`${this.baseUrl}/oauth/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					grant_type: 'authorization_code',
					code: code,
					client_id: this.clientId,
					client_secret: this.clientSecret,
					redirect_uri: this.redirectUri
				})
			});

			if (!response.ok) {
				throw new Error(`OLX OAuth error: ${response.statusText}`);
			}

			const data = await response.json();

			// Fetch user profile to get provider_user_id
			const userRes = await fetch(`${this.baseUrl}/v2/user`, {
				headers: { 'Authorization': `Bearer ${data.access_token}` }
			});
			const userData = await userRes.json();

			return {
				accessToken: data.access_token,
				refreshToken: data.refresh_token || null,
				expiresAt: new Date(Date.now() + data.expires_in * 1000),
				providerUserId: userData.id.toString()
			};
		} catch (err) {
			console.error('OLX authenticate error:', err);
			throw err;
		}
	}

	/**
	 * Refresh access token using refresh token
	 * @param {string} refreshToken
	 * @returns {Promise<{accessToken, refreshToken, expiresAt}>}
	 */
	async refreshToken(refreshToken) {
		try {
			const response = await fetch(`${this.baseUrl}/oauth/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					grant_type: 'refresh_token',
					refresh_token: refreshToken,
					client_id: this.clientId,
					client_secret: this.clientSecret
				})
			});

			if (!response.ok) {
				throw new Error(`OLX token refresh error: ${response.statusText}`);
			}

			const data = await response.json();

			return {
				accessToken: data.access_token,
				refreshToken: data.refresh_token || refreshToken,
				expiresAt: new Date(Date.now() + data.expires_in * 1000)
			};
		} catch (err) {
			console.error('OLX refreshToken error:', err);
			throw err;
		}
	}

	/**
	 * Fetch user's listings from OLX
	 * @param {string} accessToken
	 * @returns {Promise<Array>} Array of normalized listings
	 */
	async fetchListings(accessToken) {
		try {
			const listings = [];
			let page = 1;
			let hasMore = true;

			while (hasMore) {
				const response = await fetch(`${this.baseUrl}/v2/user/listings?limit=50&offset=${(page - 1) * 50}`, {
					headers: { 'Authorization': `Bearer ${accessToken}` }
				});

				if (!response.ok) {
					throw new Error(`OLX listings fetch error: ${response.statusText}`);
				}

				const data = await response.json();
				const items = data.data || [];

				if (items.length === 0) {
					hasMore = false;
				} else {
					listings.push(...items.map(item => this.normalizeData(item)));
					page++;
				}
			}

			return listings;
		} catch (err) {
			console.error('OLX fetchListings error:', err);
			throw err;
		}
	}

	/**
	 * Normalize OLX listing to standard format
	 * @param {Object} listing OLX API listing object
	 * @returns {Object} Normalized listing
	 */
	normalizeData(listing) {
		return {
			externalListingId: listing.id,
			title: listing.title || '',
			description: listing.description || '',
			price: parseFloat(listing.price) || null,
			currency: listing.currency || 'RON',
			condition: this.mapCondition(listing.condition),
			images: (listing.photos || []).map(p => p.url || p),
			url: listing.url || `https://www.olx.com/item/${listing.id}/`,
			status: listing.status === 'active' ? 'active' : 'inactive',
			provider: 'olx'
		};
	}

	/**
	 * Map OLX condition to standard format
	 * @param {string} olxCondition
	 * @returns {string} Standard condition
	 */
	mapCondition(olxCondition) {
		const conditionMap = {
			'new': 'new',
			'like_new': 'like_new',
			'used': 'good',
			'fair': 'fair',
			'for_parts': 'parts'
		};
		return conditionMap[olxCondition] || 'used';
	}

	/**
	 * Get provider name
	 * @returns {string}
	 */
	getProviderName() {
		return 'olx';
	}
}

module.exports = OlxProvider;
