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
    updateUserRole
} from '../Controller/authController.js';
import { adminMiddleware, authMiddleware, roleAcceptedMiddleware } from '../Middleware/authMiddleware.js';


const authRouter = express.Router();


// Get Method 
authRouter.get("/role-setup/:id", acceptUserRole);

authRouter.get("/me", authMiddleware, getCurrentUser);
authRouter.get("/logout", authMiddleware, logoutUser);

authRouter.get("/user", authMiddleware, roleAcceptedMiddleware, adminMiddleware, getUser);
authRouter.get("/all-users", authMiddleware, roleAcceptedMiddleware, adminMiddleware, getAllUsers);
authRouter.get("/get-all-admin", authMiddleware, roleAcceptedMiddleware, adminMiddleware, getAllAdmins);
authRouter.get("/get-user/:id", authMiddleware, roleAcceptedMiddleware, adminMiddleware, getUser);

// Post Method 
authRouter.post("/register-admin", registerAdmin);
authRouter.post("/login", loginUser);

// Put Method 
authRouter.put("/setup-role/:id", authMiddleware, acceptUserRole);

authRouter.put("/update-role/:id", authMiddleware, roleAcceptedMiddleware, adminMiddleware, updateUserRole);

authRouter.delete("/delete-user/:id", authMiddleware, roleAcceptedMiddleware, adminMiddleware, deleteUser);



export default authRouter;