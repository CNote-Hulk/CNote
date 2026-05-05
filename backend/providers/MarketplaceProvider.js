/**
 * Abstract Marketplace Provider Base Class
 * Defines the contract for all marketplace integrations
 * (OLX, eBay, etc.)
 */
class MarketplaceProvider {
	constructor(credentials = {}) {
		if (new.target === MarketplaceProvider) {
			throw new Error('MarketplaceProvider is abstract and cannot be instantiated directly');
		}

		this.credentials = credentials;
		this.providerName = this.getProviderName();
	}

	/**
	 * Authenticate with marketplace (OAuth or API keys)
	 * @returns {Promise<{
	 *  accessToken: string,
	 *  refreshToken?: string,
	 *  expiresAt?: number,
	 *  providerUserId?: string
	 * }>}
	 */
	async authenticate() {
		throw new Error(`[${this.providerName}] authenticate() must be implemented`);
	}

	/**
	 * Fetch all listings from marketplace
	 * Must return normalized listings
	 * @returns {Promise<Array<NormalizedListing>>}
	 */
	async fetchListings() {
		throw new Error(`[${this.providerName}] fetchListings() must be implemented`);
	}

	/**
	 * Refresh access token if supported
	 * @param {string} refreshToken
	 * @returns {Promise<{
	 *  accessToken: string,
	 *  refreshToken?: string,
	 *  expiresAt?: number
	 * }>}
	 */
	async refreshToken(refreshToken) {
		throw new Error(`[${this.providerName}] refreshToken() must be implemented`);
	}

	/**
	 * Normalize raw marketplace listing into standard format
	 * @param {Object} listing
	 * @returns {NormalizedListing}
	 */
	normalizeData(listing) {
		throw new Error(`[${this.providerName}] normalizeData() must be implemented`);
	}

	/**
	 * Provider identifier
	 * @returns {string} e.g. 'olx', 'ebay'
	 */
	getProviderName() {
		throw new Error('getProviderName() must be implemented');
	}

	/**
	 * Optional: validate credentials before requests
	 * @returns {boolean}
	 */
	validateCredentials() {
		return !!this.credentials;
	}

	/**
	 * Optional helper: standard error wrapper
	 */
	throwError(message, originalError = null) {
		throw new Error(
			`[${this.providerName}] ${message}` +
			(originalError ? ` | ${originalError.message}` : '')
		);
	}
}

module.exports = MarketplaceProvider;