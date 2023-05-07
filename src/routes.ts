import express from 'express';
import { getUser, partialUpdateUser, sendOtp, updateUser, verifyOtp } from './controllers/authController';
import { authMiddleware } from './middleware/auth';
import { authorization } from './middleware/authorization';

const router = express.Router();
router.post('/auth/mobile/send-otp', sendOtp);
router.post('/auth/mobile/verify-otp', verifyOtp);
router.get('/user', authMiddleware, getUser); 
router.put('/user/:userId', authMiddleware, authorization,updateUser);
router.patch('/user/:userId', authMiddleware, authorization,partialUpdateUser); // Add the PATCH route with authMiddleware


export default router;
