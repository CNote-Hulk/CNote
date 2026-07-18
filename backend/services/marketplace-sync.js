/**
 * Marketplace Sync Service
 * Handles syncing listings from connected marketplace accounts
 */
const pool = require('../db');
const OlxProvider = require('../providers/OlxProvider');
const EbayProvider = require('../providers/EbayProvider');

class MarketplaceSyncService {
	/**
	 * Get provider instance based on provider name
	 * @param {string} provider 'olx' or 'ebay'
	 * @returns {Object} Provider instance
	 */
	static getProvider(provider) {
		switch (provider.toLowerCase()) {
			case 'olx':
				return new OlxProvider();
			case 'ebay':
				return new EbayProvider();
			default:
				throw new Error(`Unknown provider: ${provider}`);
		}
	}

	/**
	 * Sync listings for a specific user and provider
	 * @param {number} userId
	 * @param {string} provider 'olx' or 'ebay'
	 * @returns {Promise<{success, message, listingsAdded, listingsUpdated}>}
	 */
	static async syncUserListings(userId, provider) {
		try {
			// Get marketplace account
			const accountRes = await pool.query(
				'SELECT * FROM marketplace_accounts WHERE user_id = $1 AND provider = $2',
				[userId, provider]
			);

			if (accountRes.rows.length === 0) {
				return {
					success: false,
					message: `No ${provider} account connected`,
					listingsAdded: 0,
					listingsUpdated: 0
				};
			}

			const account = accountRes.rows[0];
			const providerInstance = this.getProvider(provider);

			// Check if token needs refresh
			let accessToken = account.access_token;
			if (account.refresh_token && account.expires_at && new Date(account.expires_at) < new Date()) {
				try {
					const refreshed = await providerInstance.refreshToken(account.refresh_token);
					await pool.query(
						'UPDATE marketplace_accounts SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW() WHERE id = $4',
						[refreshed.accessToken, refreshed.refreshToken, refreshed.expiresAt, account.id]
					);
					accessToken = refreshed.accessToken;
				} catch (err) {
					console.error(`Failed to refresh ${provider} token:`, err);
					return {
						success: false,
						message: `Failed to refresh ${provider} token`,
						listingsAdded: 0,
						listingsUpdated: 0
					};
				}
			}

			// Fetch listings from provider
			const listings = await providerInstance.fetchListings(accessToken);

			let listingsAdded = 0;
			let listingsUpdated = 0;

			// Sync each listing
			for (const listing of listings) {
				const { externalListingId, ...listingData } = listing;

				// Check if listing exists
				const existingRes = await pool.query(
					'SELECT id FROM listings WHERE user_id = $1 AND provider = $2 AND external_listing_id = $3',
					[userId, provider, externalListingId]
				);

				if (existingRes.rows.length > 0) {
					// Update existing listing
					await pool.query(
						`UPDATE listings 
						SET title = $1, description = $2, price = $3, currency = $4, condition = $5, 
						    images = $6, url = $7, status = $8, updated_at = NOW()
						WHERE user_id = $9 AND provider = $10 AND external_listing_id = $11`,
						[
							listingData.title,
							listingData.description,
							listingData.price,
							listingData.currency,
							listingData.condition,
							JSON.stringify(listingData.images),
							listingData.url,
							listingData.status,
							userId,
							provider,
							externalListingId
						]
					);
					listingsUpdated++;
				} else {
					// Insert new listing
					await pool.query(
						`INSERT INTO listings 
						(user_id, provider, external_listing_id, title, description, price, currency, condition, images, url, status, synced_at)
						VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
						[
							userId,
							provider,
							externalListingId,
							listingData.title,
							listingData.description,
							listingData.price,
							listingData.currency,
							listingData.condition,
							JSON.stringify(listingData.images),
							listingData.url,
							listingData.status
						]
					);
					listingsAdded++;
				}
			}

			// Update last sync time
			await pool.query(
				'UPDATE marketplace_accounts SET last_sync = NOW() WHERE id = $1',
				[account.id]
			);

			return {
				success: true,
				message: `Synced ${listingsAdded + listingsUpdated} listings`,
				listingsAdded,
				listingsUpdated
			};
		} catch (err) {
			console.error(`Sync error for user ${userId}, provider ${provider}:`, err);
			return {
				success: false,
				message: err.message,
				listingsAdded: 0,
				listingsUpdated: 0
			};
		}
	}

	/**
	 * Sync listings for all users (periodic job)
	 * @param {Array<string>} providers ['olx', 'ebay'] or specific providers
	 * @returns {Promise<Object>} Sync summary
	 */
	static async syncAllUserListings(providers = ['olx', 'ebay']) {
		try {
			// Get all users with connected marketplace accounts
			const usersRes = await pool.query(
				'SELECT DISTINCT user_id FROM marketplace_accounts WHERE provider = ANY($1)',
				[providers]
			);

			const users = usersRes.rows.map(r => r.user_id);
			const results = {};

			for (const userId of users) {
				for (const provider of providers) {
					const key = `${userId}-${provider}`;
					const result = await this.syncUserListings(userId, provider);
					results[key] = result;
				}
			}

			return results;
		} catch (err) {
			console.error('Batch sync error:', err);
			throw err;
		}
	}

	/**
	 * Mark marketplace listings as inactive if they don't exist in current sync
	 * @param {number} userId
	 * @param {string} provider
	 * @param {Array<string>} activeExternalIds
	 * @returns {Promise<number>} Count of marked as inactive
	 */
	static async markInactiveListings(userId, provider, activeExternalIds) {
		try {
			const res = await pool.query(
				`UPDATE listings 
				SET status = 'inactive', updated_at = NOW()
				WHERE user_id = $1 AND provider = $2 AND external_listing_id NOT IN (${activeExternalIds.map((_, i) => `$${i + 3}`).join(',')})
				AND status != 'inactive'`,
				[userId, provider, ...activeExternalIds]
			);
			return res.rowCount;
		} catch (err) {
			console.error('Mark inactive error:', err);
			return 0;
		}
	}
}

module.exports = MarketplaceSyncService;
