/**
 * eBay Marketplace Provider
 * Handles OAuth, listings fetch, and normalization using real eBay APIs
 */
const MarketplaceProvider = require('./MarketplaceProvider');

class EbayProvider extends MarketplaceProvider {
	constructor(credentials = {}) {
		super(credentials);

		this.baseUrl = 'https://api.ebay.com';

		this.clientId = process.env.EBAY_CLIENT_ID;
		this.clientSecret = process.env.EBAY_CLIENT_SECRET;

		this.redirectUri =
			process.env.EBAY_REDIRECT_URI ||
			`${process.env.API_BASE_URL}/marketplace/ebay/callback`;
	}

	// 🔐 OAuth authorization URL
	getAuthorizationUrl(state) {
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			state,
			scope:
				'https://api.ebay.com/oauth/api_scope ' +
				'https://api.ebay.com/oauth/api_scope/sell.inventory ' +
				'https://api.ebay.com/oauth/api_scope/sell.account.readonly'
		});

		return `https://auth.ebay.com/oauth2/authorize?${params.toString()}`;
	}

	// 🔐 Exchange code → access token
	async authenticate(code) {
		const basicAuth = Buffer
			.from(`${this.clientId}:${this.clientSecret}`)
			.toString('base64');

		const response = await fetch(
			`${this.baseUrl}/identity/v1/oauth2/token`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${basicAuth}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code,
					redirect_uri: this.redirectUri
				}).toString()
			}
		);

		if (!response.ok) {
			throw new Error(`eBay auth failed: ${response.statusText}`);
		}

		const data = await response.json();

		// user identity (real endpoint)
		const userRes = await fetch(
			`${this.baseUrl}/commerce/identity/v1/user/`,
			{
				headers: {
					Authorization: `Bearer ${data.access_token}`
				}
			}
		);

		const userData = await userRes.json();

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || null,
			expiresAt: Date.now() + data.expires_in * 1000,
			providerUserId: userData.username || userData.userId || null
		};
	}

	// 🔄 Refresh token
	async refreshToken(refreshToken) {
		const basicAuth = Buffer
			.from(`${this.clientId}:${this.clientSecret}`)
			.toString('base64');

		const response = await fetch(
			`${this.baseUrl}/identity/v1/oauth2/token`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${basicAuth}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: refreshToken
				}).toString()
			}
		);

		if (!response.ok) {
			throw new Error(`eBay refresh failed: ${response.statusText}`);
		}

		const data = await response.json();

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || refreshToken,
			expiresAt: Date.now() + data.expires_in * 1000
		};
	}

	// 📦 Fetch listings (REALISTIC Sell Inventory API)
	async fetchListings(accessToken) {
		const response = await fetch(
			`${this.baseUrl}/sell/inventory/v1/inventory_item`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				}
			}
		);

		if (!response.ok) {
			throw new Error(`eBay listings fetch failed: ${response.statusText}`);
		}

		const data = await response.json();

		const items = data.inventoryItems || [];

		return items.map(item => this.normalizeData(item));
	}

	// 🔄 Normalize eBay listing
	normalizeData(item) {
		const offer = item.offer || {};
		const product = item.product || {};

		return {
			externalListingId: item.sku || item.inventoryItemId,

			title: product.title || '',
			description: product.description || '',

			price: offer.price?.value
				? parseFloat(offer.price.value)
				: null,

			currency: offer.price?.currency || 'USD',

			condition: this.mapCondition(item.condition),

			images: product.imageUrls || [],

			url:
				offer.listingUrl ||
				`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.title || '')}`,

			status: offer.status === 'ACTIVE' ? 'active' : 'inactive',

			provider: 'ebay'
		};
	}

	// 🧠 Condition mapping
	mapCondition(condition) {
		const map = {
			NEW: 'new',
			LIKE_NEW: 'like_new',
			USED: 'good',
			GOOD: 'good',
			ACCEPTABLE: 'fair',
			POOR: 'parts'
		};

		return map[condition] || 'used';
	}

	// 📛 Provider name
	getProviderName() {
		return 'ebay';
	}
}

module.exports = EbayProvider;