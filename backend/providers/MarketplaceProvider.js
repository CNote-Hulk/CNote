/**
 * Abstract Marketplace Provider Base Class
 * Defines the contract for all marketplace integrations
 */

class MarketplaceProvider {
	constructor(credentials = {}) {
		if (new.target === MarketplaceProvider) {
			throw new Error(
				'MarketplaceProvider is abstract and cannot be instantiated directly'
			);
		}

		this.credentials = credentials;
	}

	// -----------------------------------
	// Provider identity
	// -----------------------------------

	get providerName() {
		return this.getProviderName();
	}

	getProviderName() {
		throw new Error('getProviderName() must be implemented');
	}

	// -----------------------------------
	// OAuth / Authentication
	// -----------------------------------

	/**
	 * Authenticate with marketplace
	 * @returns {Promise<AuthResult>}
	 */
	async authenticate() {
		this.notImplemented('authenticate');
	}

	/**
	 * Refresh OAuth token
	 * @param {string} refreshToken
	 * @returns {Promise<AuthResult>}
	 */
	async refreshToken(refreshToken) {
		this.notImplemented('refreshToken');
	}

	// -----------------------------------
	// Listings
	// -----------------------------------

	/**
	 * Fetch marketplace listings
	 * @returns {Promise<Array<NormalizedListing>>}
	 */
	async fetchListings() {
		this.notImplemented('fetchListings');
	}

	/**
	 * Normalize provider listing
	 * @param {Object} listing
	 * @returns {NormalizedListing}
	 */
	normalizeData(listing) {
		this.notImplemented('normalizeData');
	}

	// -----------------------------------
	// Validation
	// -----------------------------------

	/**
	 * Validate provider credentials
	 * Override in providers if needed
	 */
	validateCredentials() {
		return true;
	}

	// -----------------------------------
	// Capabilities
	// -----------------------------------

	/**
	 * Provider feature flags
	 */
	getCapabilities() {
		return {
			oauth: true,
			refreshTokens: true,
			autoSync: true,
			imageImport: true,
			messaging: false
		};
	}

	// -----------------------------------
	// Helpers
	// -----------------------------------

	notImplemented(method) {
		throw new Error(
			`[${this.providerName}] ${method}() must be implemented`
		);
	}

	throwError(message, originalError = null) {
		throw new Error(
			`[${this.providerName}] ${message}` +
			(originalError ? ` | ${originalError.message}` : '')
		);
	}
}

module.exports = MarketplaceProvider;