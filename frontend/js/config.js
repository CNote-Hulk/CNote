// Frontend API configuration for production deployments (e.g., GitHub Pages).
// Override by setting window.CN_API_BASE_URL before module initialization.

export const API_BASE_URL = (window.CN_API_BASE_URL || 'https://your-backend-domain.com/api').replace(/\/$/, '');
