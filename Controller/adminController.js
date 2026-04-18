import crypto from 'crypto';
import User from '../Models/UserModel.js';
import transporter, { canSendEmail } from '../Config/nodemailerAuth.js';
import catchAsync from '../Utils/catchAsync.js';
import AppError from '../Utils/AppError.js';
import { sendSuccess } from '../Utils/response.js';
import { assertRequired, normalizeEmail, normalizePhone } from '../Utils/validation.js';
import env from '../Config/env.js';

const sanitizeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isrRoleAccepted: user.isrRoleAccepted
});

export const addUser = catchAsync(async (req, res) => {
    const { name, email, phone, role } = req.body;
    assertRequired(['name', 'email'], req.body);

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        throw new AppError('User already exists with this email', 409);
    }

    const userRole = ['user', 'admin'].includes(role) ? role : 'user';
    const temporaryPassword = crypto.randomBytes(6).toString('base64url');

    const user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        phone: normalizePhone(phone),
        role: userRole,
        password: temporaryPassword,
        isrRoleAccepted: userRole === 'admin'
    });

    const loginUrl = `${env.frontendUrl}/index.html`;
    if (canSendEmail) {
        await transporter.sendMail({
            to: normalizedEmail,
            subject: 'Account Created - Internal Polling System',
            text: `Hello ${user.name},\n\nYour account has been created with the role of ${userRole}.\n\nLogin: ${loginUrl}\nTemporary password: ${temporaryPassword}\n\nPlease reset your password after signing in.`
        });
    }

    return sendSuccess(res, 201, {
        message: canSendEmail ? 'User created successfully. Credentials sent via email.' : 'User created successfully.',
        user: sanitizeUser(user),
        temporaryPassword: canSendEmail ? undefined : temporaryPassword
    });
});
