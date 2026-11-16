import 'dotenv/config';
import './config/instrument.js';

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import * as Sentry from '@sentry/node';
import { clerkWebhooks } from './controllers/webhooks.js';
import companyRoutes from './routes/companyRoutes.js';
import connectCloudinary from './config/cloudinary.js';
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import atsRoutes from './routes/atsRoutes.js'
import { clerkMiddleware } from '@clerk/express'

const app = express();

// Middlewares
app.use(cors());
app.use(clerkMiddleware())

// Clerk webhook route (MUST come before express.json because it needs raw body)
app.post(
    '/api/webhooks/clerk',
    express.raw({ type: 'application/json' }),
    clerkWebhooks
);

// 🛑 1. PARSE JSON BODIES FIRST (Must be above routes)
app.use(express.json());

// 🛑 2. REGISTER YOUR ROUTES AFTER JSON MIDDLEWARE
app.use('/api/company', companyRoutes);

app.use('/api/jobs',jobRoutes)
app.use('/api/users',userRoutes)
app.use('/api/ats', atsRoutes)

// Home route
app.get('/', (req, res) => {
    res.send('Job Portal API working successfully!');
});

// Sentry test route
app.get('/debug-sentry', (req, res) => {
    throw new Error('My first Sentry error!');
});

// Sentry error handler
Sentry.setupExpressErrorHandler(app);

// Connect database and Cloudinary
await connectDB();
await connectCloudinary();

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
