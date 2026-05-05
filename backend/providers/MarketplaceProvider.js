/**
 * Abstract Marketplace Provider Base Class
 * Defines the interface that all marketplace providers must implement
 */
class MarketplaceProvider {
	constructor(credentials) {
		this.credentials = credentials;
	}

	/**
	 * Authenticate with the marketplace
	 * @returns {Promise<{accessToken, refreshToken, expiresAt, providerUserId}>}
	 */
	async authenticate() {
		throw new Error('authenticate() must be implemented');
	}

	/**
	 * Fetch all listings from marketplace
	 * @returns {Promise<Array>} Array of normalized listings
	 */
	async fetchListings() {
		throw new Error('fetchListings() must be implemented');
	}

	/**
	 * Refresh authentication token
	 * @param {string} refreshToken
	 * @returns {Promise<{accessToken, refreshToken, expiresAt}>}
	 */
	async refreshToken(refreshToken) {
		throw new Error('refreshToken() must be implemented');
	}

	/**
	 * Normalize marketplace-specific listing format to standard format
	 * @param {Object} listing Marketplace-specific listing data
	 * @returns {Object} Normalized listing
	 */
	normalizeData(listing) {
		throw new Error('normalizeData() must be implemented');
	}

	/**
	 * Get provider name
	 * @returns {string} Provider identifier (olx, ebay, etc.)
	 */
	getProviderName() {
		throw new Error('getProviderName() must be implemented');
	}
}

module.exports = MarketplaceProvider;
