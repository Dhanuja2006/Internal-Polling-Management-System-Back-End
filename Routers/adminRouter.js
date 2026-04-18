import express from "express";
import { addUser } from "../Controller/adminController.js";
import {
    adminMiddleware,
    authMiddleware,
    roleAcceptedMiddleware
} from "../Middleware/authMiddleware.js";

const adminRouter = express.Router();



// Post Method (require authentication AND role acceptance)
adminRouter.post("/create-user", authMiddleware, roleAcceptedMiddleware, adminMiddleware, addUser);



export default adminRouter;