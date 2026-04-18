import express from 'express';
import {
    acceptUserRole,
    deleteUser,
    getAllAdmins,
    getAllUsers,
    getUser,
    getCurrentUser,
    loginUser,
    logoutUser,
    registerUser,
    registerAdmin,
    updateUserRole,
    forgotPassword,
    resetPassword,
    refreshToken,
    verifyEmail,
    resendVerification
} from '../Controller/authController.js';
import { adminMiddleware, authMiddleware, roleAcceptedMiddleware } from '../Middleware/authMiddleware.js';

const authRouter = express.Router();

authRouter.post('/register', registerUser);
authRouter.post('/register-admin', registerAdmin);
authRouter.post('/login', loginUser);
authRouter.post('/refresh-token', refreshToken);
authRouter.get('/verify-email/:token', verifyEmail);
authRouter.post('/resend-verification', resendVerification);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password/:token', resetPassword);
authRouter.get('/me', authMiddleware, getCurrentUser);
authRouter.get('/logout', authMiddleware, logoutUser);
authRouter.post('/logout', authMiddleware, logoutUser);
authRouter.get('/all-users', authMiddleware, roleAcceptedMiddleware, adminMiddleware, getAllUsers);
authRouter.get('/get-all-admin', authMiddleware, roleAcceptedMiddleware, adminMiddleware, getAllAdmins);
authRouter.get('/get-user/:id', authMiddleware, roleAcceptedMiddleware, adminMiddleware, getUser);
authRouter.put('/setup-role/:id', authMiddleware, roleAcceptedMiddleware, adminMiddleware, acceptUserRole);
authRouter.put('/update-role/:id', authMiddleware, roleAcceptedMiddleware, adminMiddleware, updateUserRole);
authRouter.delete('/delete-user/:id', authMiddleware, roleAcceptedMiddleware, adminMiddleware, deleteUser);

export default authRouter;
