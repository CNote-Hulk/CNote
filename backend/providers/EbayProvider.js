/**
 * eBay Marketplace Provider
 * Handles OAuth, listings fetch, and normalization using eBay APIs.
 */

const MarketplaceProvider = require('./MarketplaceProvider');

class EbayProvider extends MarketplaceProvider {
	constructor(credentials = {}) {
		super(credentials);

		this.baseUrl = 'https://api.ebay.com';
		this.authBase = 'https://auth.ebay.com';

		this.clientId = process.env.EBAY_CLIENT_ID;
		this.clientSecret = process.env.EBAY_CLIENT_SECRET;
		this.ruName = process.env.EBAY_RU_NAME;

		this.marketplaceId = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
		this.locale = process.env.EBAY_LOCALE || 'en-US';
		this.scopes = [
			'https://api.ebay.com/oauth/api_scope',
			'https://api.ebay.com/oauth/api_scope/sell.inventory',
			'https://api.ebay.com/oauth/api_scope/sell.account.readonly'
		];
	}

	// Headers accepted by eBay Sell APIs.
	// Do not send Accept-Language here: inventory_item rejects it.
	get ebayHeaders() {
		return {
			Accept: 'application/json',
			'Content-Language': this.locale,
			'X-EBAY-C-MARKETPLACE-ID': this.marketplaceId
		};
	}

	// Read eBay JSON responses and preserve the API error body in thrown errors.
	async parseJsonResponse(response, errorPrefix) {
		if (response.ok) return response.json();

		const errText = await response.text();
		throw new Error(`${errorPrefix}: ${response.status} ${errText || response.statusText}`);
	}

	// OAuth authorization URL. eBay requires the RuName in redirect_uri.
	getAuthorizationUrl(state) {
		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			redirect_uri: this.ruName,
			state,
			scope: this.scopes.join(' ')
		});

		return `${this.authBase}/oauth2/authorize?${params.toString()}`;
	}

	// Exchange authorization code for access/refresh tokens, then fetch identity.
	async authenticate(code) {
		const basicAuth = Buffer
			.from(`${this.clientId}:${this.clientSecret}`)
			.toString('base64');

		const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				Authorization: `Basic ${basicAuth}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri: this.ruName
			}).toString()
		});

		const data = await this.parseJsonResponse(response, 'eBay auth failed');

		const userRes = await fetch(`${this.baseUrl}/commerce/identity/v1/user/`, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${data.access_token}`
			}
		});

		const userData = await this.parseJsonResponse(userRes, 'eBay identity fetch failed');

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || null,
			expiresAt: new Date(Date.now() + data.expires_in * 1000),
			providerUserId: userData.username || userData.userId || null
		};
	}

	// Refresh OAuth token. eBay may omit a new refresh token, so keep the old one.
	async refreshToken(refreshToken) {
		const basicAuth = Buffer
			.from(`${this.clientId}:${this.clientSecret}`)
			.toString('base64');

		const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				Authorization: `Basic ${basicAuth}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
				scope: this.scopes.join(' ')
			}).toString()
		});

		const data = await this.parseJsonResponse(response, 'eBay refresh failed');

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || refreshToken,
			expiresAt: new Date(Date.now() + data.expires_in * 1000)
		};
	}

	// Fetch all inventory items, following eBay offset pagination.
	async fetchListings(accessToken) {
		const items = [];
		const limit = 200;
		let offset = 0;
		let total = null;

		do {
			const url = new URL(`${this.baseUrl}/sell/inventory/v1/inventory_item`);
			url.searchParams.set('limit', String(limit));
			url.searchParams.set('offset', String(offset));

			const response = await fetch(url, {
				headers: {
					...this.ebayHeaders,
					Authorization: `Bearer ${accessToken}`
				}
			});

			const data = await this.parseJsonResponse(response, 'eBay listings fetch failed');
			const pageItems = data.inventoryItems || [];

			items.push(...pageItems);
			total = typeof data.total === 'number' ? data.total : items.length;
			offset += pageItems.length;
		} while (items.length < total && offset > 0);

		return items.map(item => this.normalizeData(item));
	}

	// Normalize an eBay inventory item into the shared listing shape.
	normalizeData(item) {
		const offer = item.offer || {};
		const product = item.product || {};

		return {
			externalListingId: item.sku || item.inventoryItemId,
			title: product.title || '',
			description: product.description || '',
			price: offer.price?.value ? parseFloat(offer.price.value) : null,
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

	// Map eBay condition names to the app's listing condition values.
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

	// Provider name used by MarketplaceSyncService.
	getProviderName() {
		return 'ebay';
	}
}

module.exports = EbayProvider;
