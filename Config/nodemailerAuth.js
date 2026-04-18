import nodemailer from 'nodemailer';
import env from './env.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: env.emailUser,
        pass: env.emailPass
    }
});

export const canSendEmail = Boolean(env.emailUser && env.emailPass);

export default transporter;
