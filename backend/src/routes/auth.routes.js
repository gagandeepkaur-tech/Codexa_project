import { Router } from "express";
import { getAuthMe, loginUser, registerUser } from "../controllers/auth.mongo.controller.js";
import {
  attachRoleProfile,
  requireAuth,
  requireMongoUser,
  requireRole
} from "../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register/admin", requireAuth, requireRole("admin"), registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/me", requireAuth, requireMongoUser, attachRoleProfile, getAuthMe);

export default authRouter;
