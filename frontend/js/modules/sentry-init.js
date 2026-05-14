(function () {
    if (typeof Sentry === 'undefined') return;

    Sentry.init({
        dsn: window.SENTRY_DSN_FRONTEND || '',
        environment: 'production',
        tracesSampleRate: 0.1,
        // PII scrubbing — never send passwords or tokens
        beforeSend: function (event) {
            if (event.request && event.request.data) {
                ['password', 'token', 'cn_token', 'secret'].forEach(function (key) {
                    if (event.request.data[key]) {
                        event.request.data[key] = '[REDACTED]';
                    }
                });
            }
            return event;
        },
    });
})();
