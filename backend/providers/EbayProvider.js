/**
 * eBay Marketplace Provider
 * Handles OAuth flow, listing fetching, and data normalization for eBay
 */
const MarketplaceProvider = require('./MarketplaceProvider');

class EbayProvider extends MarketplaceProvider {
	constructor(credentials = {}) {
		super(credentials);
		this.baseUrl = 'https://api.ebay.com';
		this.clientId = process.env.EBAY_CLIENT_ID;
		this.clientSecret = process.env.EBAY_CLIENT_SECRET;
		this.redirectUri = process.env.EBAY_REDIRECT_URI || `${process.env.API_BASE_URL}/marketplace/ebay/callback`;
		this.ruName = process.env.EBAY_RU_NAME || 'CNote-ConsoleNotebook';
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
			scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory'
		});
		return `https://auth.ebay.com/oauth2/authorize?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for access token
	 * @param {string} code Authorization code from OAuth callback
	 * @returns {Promise<{accessToken, refreshToken, expiresAt, providerUserId}>}
	 */
	async authenticate(code) {
		try {
			const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

			const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${credentials}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code: code,
					redirect_uri: this.redirectUri
				}).toString()
			});

			if (!response.ok) {
				throw new Error(`eBay OAuth error: ${response.statusText}`);
			}

			const data = await response.json();

			// Fetch user profile to get provider_user_id
			const userRes = await fetch(`${this.baseUrl}/sell/account/v1/user`, {
				headers: { 'Authorization': `Bearer ${data.access_token}` }
			});
			const userData = await userRes.json();

			return {
				accessToken: data.access_token,
				refreshToken: data.refresh_token || null,
				expiresAt: new Date(Date.now() + data.expires_in * 1000),
				providerUserId: userData.username || userData.userId
			};
		} catch (err) {
			console.error('eBay authenticate error:', err);
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
			const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

			const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
				method: 'POST',
				headers: {
					'Authorization': `Basic ${credentials}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: refreshToken
				}).toString()
			});

			if (!response.ok) {
				throw new Error(`eBay token refresh error: ${response.statusText}`);
			}

			const data = await response.json();

			return {
				accessToken: data.access_token,
				refreshToken: data.refresh_token || refreshToken,
				expiresAt: new Date(Date.now() + data.expires_in * 1000)
			};
		} catch (err) {
			console.error('eBay refreshToken error:', err);
			throw err;
		}
	}

	/**
	 * Fetch user's listings from eBay
	 * @param {string} accessToken
	 * @returns {Promise<Array>} Array of normalized listings
	 */
	async fetchListings(accessToken) {
		try {
			const listings = [];
			let offset = 0;
			let limit = 50;
			let totalCount = 0;
			let isFirstPage = true;

			while (isFirstPage || offset < totalCount) {
				const response = await fetch(
					`${this.baseUrl}/sell/inventory/v1/inventory?limit=${limit}&offset=${offset}`,
					{
						headers: { 'Authorization': `Bearer ${accessToken}` }
					}
				);

				if (!response.ok) {
					throw new Error(`eBay listings fetch error: ${response.statusText}`);
				}

				const data = await response.json();
				const items = data.inventories || [];

				if (isFirstPage) {
					totalCount = data.total || 0;
					isFirstPage = false;
				}

				if (items.length === 0) {
					break;
				}

				listings.push(...items.map(item => this.normalizeData(item)));
				offset += limit;
			}

			return listings;
		} catch (err) {
			console.error('eBay fetchListings error:', err);
			throw err;
		}
	}

	/**
	 * Normalize eBay listing to standard format
	 * @param {Object} listing eBay API inventory object
	 * @returns {Object} Normalized listing
	 */
	normalizeData(listing) {
		const images = [];
		if (listing.product && listing.product.imageUrls) {
			images.push(...listing.product.imageUrls);
		}

		return {
			externalListingId: listing.sku || listing.inventoryItemId,
			title: (listing.product && listing.product.title) || '',
			description: (listing.product && listing.product.description) || '',
			price: (listing.offers && listing.offers[0] && listing.offers[0].price && parseFloat(listing.offers[0].price.value)) || null,
			currency: (listing.offers && listing.offers[0] && listing.offers[0].price && listing.offers[0].price.currency) || 'USD',
			condition: this.mapCondition(listing.condition),
			images: images,
			url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(listing.product?.title || '')}`,
			status: listing.status === 'ACTIVE' ? 'active' : 'inactive',
			provider: 'ebay'
		};
	}

	/**
	 * Map eBay condition to standard format
	 * @param {string} ebayCondition
	 * @returns {string} Standard condition
	 */
	mapCondition(ebayCondition) {
		const conditionMap = {
			'NEW': 'new',
			'LIKE_NEW': 'like_new',
			'USED': 'good',
			'ACCEPTABLE': 'fair',
			'GOOD': 'good',
			'POOR': 'parts'
		};
		return conditionMap[ebayCondition] || 'used';
	}

	/**
	 * Get provider name
	 * @returns {string}
	 */
	getProviderName() {
		return 'ebay';
	}
}

module.exports = EbayProvider;
