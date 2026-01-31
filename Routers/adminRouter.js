import express from "express";
import { addUer } from "../Controller/aminControler.js";
import { 
    adminMiddleware, 
    authMiddleware 
} from "../Middleware/authMiddleware.js";

const adminRouter = express.Router();

// Get Method


// Post Method
adminRouter.post("/create-user",authMiddleware, adminMiddleware, addUer);

// Put Method


// Delete Method


export default adminRouter;