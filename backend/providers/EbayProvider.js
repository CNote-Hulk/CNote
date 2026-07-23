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

		// eBay uses RuName, NOT direct redirect URL
		this.ruName = process.env.EBAY_RU_NAME;
	}

	// 🔐 OAuth authorization URL
	getAuthorizationUrl(state) {
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: this.ruName,
			state,
			scope: [
				'https://api.ebay.com/oauth/api_scope',
				'https://api.ebay.com/oauth/api_scope/sell.inventory',
				'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
				'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
			].join(' ')
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

					// IMPORTANT: must be RuName
					redirect_uri: this.ruName
				}).toString()
			}
		);

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`eBay auth failed: ${errText}`);
		}

		const data = await response.json();

		// fetch user identity
		let providerUserId = null;
		try {
			const userRes = await fetch(
				'https://apiz.ebay.com/commerce/identity/v1/user/',
				{
					headers: {
						Authorization: `Bearer ${data.access_token}`,
						'Content-Type': 'application/json'
					}
				}
			);
			if (userRes.ok) {
				const userData = await userRes.json();
				providerUserId = userData.username || userData.userId || null;
			}
		} catch (_) {}

		return {
			accessToken: data.access_token,

			refreshToken: data.refresh_token || null,

			expiresAt: new Date(Date.now() + data.expires_in * 1000),

			providerUserId
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
			const errText = await response.text();
			throw new Error(`eBay refresh failed: ${errText}`);
		}

		const data = await response.json();

		return {
			accessToken: data.access_token,

			refreshToken:
				data.refresh_token ||
				refreshToken,

			expiresAt:
				new Date(Date.now() + data.expires_in * 1000)
		};
	}

	// 📦 Fetch inventory items
	async fetchListings(accessToken) {
		const response = await fetch(
			`${this.baseUrl}/sell/inventory/v1/inventory_item`,
			{
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'Accept-Language': 'en-US',
					'Content-Language': 'en-US',
					'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
				}
			}
		);

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`eBay listings fetch failed: ${errText}`);
		}

		const data = await response.json();

		const items = data.inventoryItems || [];

		return items.map(item => this.normalizeData(item));
	}

	// 🔄 Normalize listing
	normalizeData(item) {
		const offer = item.offer || {};
		const product = item.product || {};

		return {
			externalListingId:
				item.sku ||
				item.inventoryItemId,

			title: product.title || '',

			description:
				product.description || '',

			price: offer.price?.value
				? parseFloat(offer.price.value)
				: null,

			currency:
				offer.price?.currency || 'USD',

			condition:
				this.mapCondition(item.condition),

			images:
				product.imageUrls || [],

			url:
				offer.listingUrl ||
				`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.title || '')}`,

			status:
				offer.status === 'ACTIVE'
					? 'active'
					: 'inactive',

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