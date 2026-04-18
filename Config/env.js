import dotenv from 'dotenv';

dotenv.config();

const parseOrigins = (value) =>
    (value || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

const requiredVariables = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_CODE'];

const missingVariables = requiredVariables.filter((key) => !process.env[key]);

if (missingVariables.length) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
const configuredOrigins = parseOrigins(process.env.CORS_ORIGINS);

const env = {
    port: Number(process.env.PORT || 8080),
    nodeEnv,
    isProduction: nodeEnv === 'production',
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    adminCode: process.env.ADMIN_CODE,
    frontendUrl,
    corsOrigins: Array.from(new Set([frontendUrl, ...configuredOrigins])),
    emailUser: process.env.EMAIL_USER || '',
    emailPass: process.env.EMAIL_PASS || ''
};

export default env;
