/**
 * Marketplace Utilities Module
 * Helper functions for marketplace operations across the application
 */

export const MarketplaceModule = {
	/**
	 * Get provider display name and icon
	 */
	getProviderInfo(provider) {
		const info = {
			olx: {
				name: 'OLX',
				icon: '🛒',
				color: '#0066cc',
				url: 'https://www.olx.com'
			},
			ebay: {
				name: 'eBay',
				icon: '🏪',
				color: '#e53238',
				url: 'https://www.ebay.com'
			}
		};
		return info[provider] || { name: provider, icon: '📦', color: '#666' };
	},

	/**
	 * Format condition text
	 */
	formatCondition(condition) {
		const conditions = {
			'new': 'New',
			'like_new': 'Like New',
			'good': 'Good',
			'fair': 'Fair',
			'parts': 'Parts',
			'used': 'Used'
		};
		return conditions[condition] || condition;
	},

	/**
	 * Format price with currency
	 */
	formatPrice(price, currency = 'RON') {
		if (price === null || price === undefined) return 'N/A';
		const formatted = parseFloat(price).toFixed(2);
		const symbols = {
			'RON': 'RON',
			'EUR': '€',
			'USD': '$',
			'GBP': '£'
		};
		return `${formatted} ${symbols[currency] || currency}`;
	},

	/**
	 * Open marketplace provider page in new tab
	 */
	openListing(url) {
		if (!url) return false;
		window.open(url, '_blank', 'noopener,noreferrer');
		return true;
	},

	/**
	 * Get provider link from listing
	 */
	getProviderLink(provider, url) {
		if (!url) {
			const baseUrls = {
				'olx': 'https://www.olx.com',
				'ebay': 'https://www.ebay.com'
			};
			return baseUrls[provider] || '';
		}
		return url;
	},

	/**
	 * Create marketplace badge HTML
	 */
	createProviderBadge(provider) {
		const info = this.getProviderInfo(provider);
		return `<span class="marketplace-badge marketplace-badge--${provider}" title="Imported from ${info.name}">${info.icon} ${info.name}</span>`;
	},

	/**
	 * Create marketplace button HTML
	 */
	createMarketplaceButton(provider, url) {
		const info = this.getProviderInfo(provider);
		if (!url) return '';
		return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="marketplace-action-btn marketplace-action-btn--${provider}" title="View on ${info.name}">
			${info.icon} View on ${info.name}
		</a>`;
	},

	/**
	 * Validate marketplace provider
	 */
	isValidProvider(provider) {
		return ['olx', 'ebay'].includes((provider || '').toLowerCase());
	},

	/**
	 * Get sync status text
	 */
	getSyncStatusText(lastSync) {
		if (!lastSync) return 'Never synced';
		const date = new Date(lastSync);
		const now = new Date();
		const diff = Math.floor((now - date) / 1000);

		if (diff < 60) return 'Just synced';
		if (diff < 3600) return `Synced ${Math.floor(diff / 60)} min ago`;
		if (diff < 86400) return `Synced ${Math.floor(diff / 3600)} hours ago`;
		return `Synced ${date.toLocaleDateString()}`;
	}
};
