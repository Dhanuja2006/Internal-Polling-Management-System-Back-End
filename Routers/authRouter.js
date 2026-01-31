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
import { adminMiddleware, authMiddleware } from '../Middleware/authMiddleware.js';


const authRouter = express.Router();


// Get Method
authRouter.get("/me", authMiddleware, getCurrentUser);

authRouter.get("/user", authMiddleware, adminMiddleware, getUser);

authRouter.get("/role-setup/:id", acceptUserRole);

authRouter.get("/all-users", authMiddleware, adminMiddleware, getAllUsers);

authRouter.get("/get-all-admin", authMiddleware, adminMiddleware, getAllAdmins);

authRouter.get("/get-user/:id", authMiddleware, adminMiddleware, getUser);

authRouter.get("/logout", authMiddleware, logoutUser);

// Post Method
authRouter.post("/register", registerUser);

authRouter.post("/register-admin", registerAdmin);

authRouter.post("/login", loginUser);

// Put Method

authRouter.put("/update-role/:id", authMiddleware, adminMiddleware, updateUserRole);

authRouter.put("/setup-role/:id", authMiddleware, acceptUserRole);

// Delete Method
authRouter.delete("/delete-user/:id", authMiddleware, adminMiddleware, deleteUser);




export default authRouter;