import jwt from 'jsonwebtoken';
import env from '../Config/env.js';

const generateTokens = (id) => {
    const accessToken = jwt.sign({ id }, env.jwtSecret, {
        expiresIn: '15m'
    });

    const refreshToken = jwt.sign({ id }, env.jwtSecret, {
        expiresIn: '7d'
    });

    return { accessToken, refreshToken };
};

export const setTokenCookies = (res, accessToken, refreshToken) => {
    res.cookie('token', accessToken, {
        httpOnly: true,
        sameSite: env.isProduction ? 'none' : 'lax',
        secure: env.isProduction,
        maxAge: 15 * 60 * 1000 // 15 mins
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: env.isProduction ? 'none' : 'lax',
        secure: env.isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

export default generateTokens;
