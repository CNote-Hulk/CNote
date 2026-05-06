// Minimal subset to check the new sections parse correctly
const express = require('express');
const helmet = require('helmet');
const app = express();
const rateLimit = require('express-rate-limit');

app.use(helmet({
	contentSecurityPolicy: {
		reportOnly: true,
		directives: {
			defaultSrc:      ["'self'"],
			scriptSrc: [
				"'self'",
				'https://cdn.socket.io',
				'https://cdn.jsdelivr.net',
				'https://www.googletagmanager.com',
				'https://www.google-analytics.com',
			],
			styleSrc: [
				"'self'",
				"'unsafe-inline'",
				'https://fonts.googleapis.com',
			],
			fontSrc:    ["'self'", 'data:', 'https://fonts.gstatic.com'],
			imgSrc:     ["'self'", 'data:', 'blob:', 'https:'],
			connectSrc: [
				"'self'",
				'https://www.google-analytics.com',
				'https://www.googletagmanager.com',
				'https://*.supabase.co',
			],
			frameSrc:        ['https://www.youtube.com', 'https://www.youtube-nocookie.com'],
			frameAncestors:  ["'self'"],
			objectSrc:       ["'none'"],
			baseUri:         ["'self'"],
			formAction:      ["'self'"],
			upgradeInsecureRequests: [],
			reportUri:       ['/api/csp-report'],
		},
	},
	strictTransportSecurity: {
		maxAge: 31536000,
		includeSubDomains: true,
		preload: false,
	},
	crossOriginEmbedderPolicy: false,
	referrerPolicy: { policy: 'no-referrer-when-downgrade' },
}));

app.post(
	'/api/csp-report',
	express.text({ type: ['application/csp-report', 'application/reports+json'], limit: '50kb' }),
	(req, res) => {
		try {
			const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
			const reports = Array.isArray(raw) ? raw : [raw];
			reports.forEach((report) => {
				const violation = report['csp-report'] || report.body || report;
				console.warn('[CSP Violation]', JSON.stringify({
					documentUri:       violation['document-uri']        || violation.documentURL,
					blockedUri:        violation['blocked-uri']         || violation.blockedURL,
					violatedDirective: violation['violated-directive']  || violation.effectiveDirective,
					originalPolicy:    violation['original-policy']     || violation.originalPolicy,
					sourceFile:        violation['source-file']         || violation.sourceFile,
					lineNumber:        violation['line-number']         || violation.lineNumber,
					columnNumber:      violation['column-number']       || violation.columnNumber,
					disposition:       violation.disposition,
					referrer:          violation.referrer               || violation['referrer'],
					timestamp:         new Date().toISOString(),
				}));
			});
		} catch (err) {
			console.warn('[CSP Violation] Failed to parse report body:', err.message);
		}
		res.status(204).end();
	}
);

console.log('All sections parse and load correctly.');
