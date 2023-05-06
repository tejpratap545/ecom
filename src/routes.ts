import express from 'express';
import { sendOtp, verifyOtp } from './controllers/authController';

const router = express.Router();
router.post('/auth/mobile/send-otp', sendOtp);
router.post('/auth/mobile/verify-otp', verifyOtp);

export default router;
