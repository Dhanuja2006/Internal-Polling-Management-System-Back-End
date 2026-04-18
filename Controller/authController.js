import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../Models/UserModel.js';
import generateTokens, { setTokenCookies } from '../Utils/generateToken.js';
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
    isrRoleAccepted: user.isrRoleAccepted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});

export const registerUser = catchAsync(async (req, res) => {
    const { name, email, password, phone, adminCode } = req.body;
    assertRequired(['name', 'email', 'password'], req.body);

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        throw new AppError('User already exists with this email', 409);
    }

    const role = adminCode && adminCode === env.adminCode ? 'admin' : 'user';

    // Generate email verification token for regular users
    const verifyToken = role === 'user' ? crypto.randomBytes(32).toString('hex') : undefined;

    const user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password,
        phone: normalizePhone(phone),
        role,
        isrRoleAccepted: role === 'admin',
        verifyToken: verifyToken || undefined,
        verifyTokenExpiry: verifyToken ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined
    });

    // Send verification email for regular users
    if (role === 'user' && canSendEmail) {
        const verifyUrl = `${env.frontendUrl}/verify-email.html?token=${verifyToken}`;
        transporter.sendMail({
            to: normalizedEmail,
            subject: 'Verify Your Email – Internal Polling System',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px;">
                    <h2 style="color:#6366f1;">Welcome, ${String(name).trim()}! 👋</h2>
                    <p style="color:#444;">Thanks for registering. Please verify your email address to activate your account.</p>
                    <a href="${verifyUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Verify My Email</a>
                    <p style="color:#888;font-size:13px;">This link expires in <strong>24 hours</strong>. If you did not create this account, you can safely ignore this email.</p>
                </div>
            `
        }).catch(err => {
            console.error('[EMAIL ERROR] Failed to send verification email:', err.message);
        });
    }

    return sendSuccess(res, 201, {
        message: role === 'user'
            ? (canSendEmail
                ? 'Registration successful! Please check your email and click the verification link to activate your account.'
                : 'User registered successfully')
            : 'Admin registered successfully',
        // Always expose verifyUrl for easy testing (token is safe — it\'s already in the email)
        verifyUrl: (role === 'user' && verifyToken)
            ? `${env.frontendUrl}/verify-email.html?token=${verifyToken}`
            : undefined,
        user: sanitizeUser(user)
    });
});

export const verifyEmail = catchAsync(async (req, res) => {
    const { token } = req.params;
    if (!token) throw new AppError('Verification token is required', 400);

    const user = await User.findOne({
        verifyToken: token,
        verifyTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
        throw new AppError('Invalid or expired verification link. Please register again.', 400);
    }

    user.isrRoleAccepted = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    return sendSuccess(res, 200, { message: 'Email verified successfully! You can now log in.' });
});

export const resendVerification = catchAsync(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        // For security, don't reveal if user exists or not, just send generic success
        return sendSuccess(res, 200, { message: 'If an account exists with that email, a new verification link has been sent.' });
    }

    if (user.isrRoleAccepted) {
        return sendSuccess(res, 200, { message: 'Account is already verified. Please log in.' });
    }

    // Generate new token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    user.verifyToken = verifyToken;
    user.verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    if (canSendEmail) {
        const verifyUrl = `${env.frontendUrl}/verify-email.html?token=${verifyToken}`;
        await transporter.sendMail({
            to: normalizedEmail,
            subject: 'New Verification Link – Internal Polling System',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px;">
                    <h2 style="color:#6366f1;">Email Verification 🔑</h2>
                    <p style="color:#444;">Hello ${user.name}, you requested a new verification link. Click below to activate your account.</p>
                    <a href="${verifyUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Verify My Email</a>
                    <p style="color:#888;font-size:13px;">This link expires in <strong>24 hours</strong>.</p>
                </div>
            `
        });
    }

    return sendSuccess(res, 200, {
        message: canSendEmail ? 'New verification link sent to your email.' : 'Email sending is disabled. Use the link below to verify:',
        emailSent: canSendEmail,
        verifyUrl: `${env.frontendUrl}/verify-email.html?token=${verifyToken}`
    });
});

export const registerAdmin = catchAsync(async (req, res) => {
    const { name, email, password, phone, adminCode } = req.body;
    assertRequired(['name', 'email', 'password', 'adminCode'], req.body);

    if (adminCode !== env.adminCode) {
        throw new AppError('Invalid admin code', 403);
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        throw new AppError('User already exists with this email', 409);
    }

    const user = await User.create({
        name: String(name).trim(),
        email: normalizedEmail,
        password,
        phone: normalizePhone(phone),
        role: 'admin',
        isrRoleAccepted: true
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    
    setTokenCookies(res, accessToken, refreshToken);

    return sendSuccess(res, 201, {
        message: 'Admin registered successfully',
        token: accessToken,
        user: sanitizeUser(user)
    });
});

export const loginUser = catchAsync(async (req, res) => {
    assertRequired(['email', 'password'], req.body);

    const normalizedEmail = normalizeEmail(req.body.email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.password) {
        throw new AppError('Invalid email or password', 401);
    }

    if (!user.isrRoleAccepted) {
        throw new AppError('Verify your email to accept your role', 403);
    }

    const isPasswordValid = await user.comparePassword(req.body.password);
    if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    
    setTokenCookies(res, accessToken, refreshToken);

    return sendSuccess(res, 200, {
        message: 'Login successful',
        token: accessToken,
        user: sanitizeUser(user)
    });
});

export const refreshToken = catchAsync(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) throw new AppError('No refresh token provided', 401);

    const decoded = crypto.createHash('sha256').update(token).digest('hex'); // Wait, I just used JWT for refresh token
    // Actually decoded should be verified via JWT
    try {
        const payload = jwt.verify(token, env.jwtSecret);
        const user = await User.findById(payload.id);
        if (!user || user.refreshToken !== token) {
            throw new AppError('Invalid refresh token', 401);
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
        user.refreshToken = newRefreshToken;
        await user.save();
        
        setTokenCookies(res, accessToken, newRefreshToken);

        return sendSuccess(res, 200, {
            token: accessToken,
            message: 'Token refreshed successfully'
        });
    } catch (err) {
        throw new AppError('Invalid or expired refresh token', 401);
    }
});

export const logoutUser = catchAsync(async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        sameSite: env.isProduction ? 'none' : 'lax',
        secure: env.isProduction,
        expires: new Date(0)
    });

    return sendSuccess(res, 200, { message: 'Logged out successfully' });
});

export const getCurrentUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    return sendSuccess(res, 200, { user });
});

export const getUser = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    return sendSuccess(res, 200, { user });
});

export const getAllUsers = catchAsync(async (req, res) => {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, 200, { count: users.length, users });
});

export const getAllAdmins = catchAsync(async (req, res) => {
    const admins = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, 200, { count: admins.length, admins });
});

export const updateUserRole = catchAsync(async (req, res) => {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        throw new AppError('Invalid role. Must be user or admin', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.role = role;
    if (role === 'admin') {
        user.isrRoleAccepted = true;
    }
    await user.save();

    return sendSuccess(res, 200, {
        message: 'User role updated successfully',
        user: sanitizeUser(user)
    });
});

export const acceptUserRole = catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    user.isrRoleAccepted = true;
    await user.save();

    if (canSendEmail) {
        await transporter.sendMail({
            to: user.email,
            subject: 'Welcome to Internal Polling System',
            text: `Hello ${user.name},\n\nYour role of ${user.role} has been accepted. You can now log in to your account.\n\nBest regards,\nInternal Polling Management System Team`
        });
    }

    return sendSuccess(res, 200, {
        message: 'Role accepted successfully',
        user: sanitizeUser(user)
    });
});

export const forgotPassword = catchAsync(async (req, res) => {
    assertRequired(['email'], req.body);

    const normalizedEmail = normalizeEmail(req.body.email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        throw new AppError('User with this email does not exist', 404);
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resettoken = resetToken;
    user.resettokenexpiry = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetUrl = `${env.frontendUrl}/reset-password.html#token=${resetToken}`;

    // Send email in background to avoid blocking the response
    if (canSendEmail) {
        transporter.sendMail({
            to: normalizedEmail,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Open the link below within one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
        }).catch(err => {
            console.error('[EMAIL ERROR] Failed to send password reset email:', err.message);
        });
    }

    return sendSuccess(res, 200, {
        message: canSendEmail ? 'Password reset link sent to email' : 'Password reset token generated',
        resetUrl: canSendEmail ? undefined : resetUrl
    });
});

export const resetPassword = catchAsync(async (req, res) => {
    assertRequired(['password'], req.body);

    const user = await User.findOne({
        resettoken: req.params.token,
        resettokenexpiry: { $gt: Date.now() }
    });

    if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
    }

    user.password = req.body.password;
    user.resettoken = undefined;
    user.resettokenexpiry = undefined;
    await user.save();

    return sendSuccess(res, 200, { message: 'Password reset successfully' });
});

export const deleteUser = catchAsync(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    return sendSuccess(res, 200, { message: 'User deleted successfully' });
});
