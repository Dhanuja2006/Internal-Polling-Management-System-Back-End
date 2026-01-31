import express from "express";
import { addUer } from "../Controller/aminControler.js";
import {
    adminMiddleware,
    authMiddleware,
    roleAcceptedMiddleware
} from "../Middleware/authMiddleware.js";

const adminRouter = express.Router();



// Post Method (require authentication AND role acceptance)
adminRouter.post("/create-user", authMiddleware, roleAcceptedMiddleware, adminMiddleware, addUer);



export default adminRouter;