
import 'dotenv/config';

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    integrations: [
        nodeProfilingIntegration(),
        Sentry.mongooseIntegration(),
    ],

    // Performance monitoring
    tracesSampleRate: 1.0,

    // CPU profiling
    profilesSampleRate: 1.0,

    // Privacy
    sendDefaultPii: false,
});

// Diagnostic messages
console.log('Sentry initialized:', Sentry.isInitialized());
console.log('Sentry DSN loaded:', Boolean(process.env.SENTRY_DSN));

export default Sentry;
