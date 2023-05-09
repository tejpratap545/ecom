import express from 'express';
import { getUser, partialUpdateUser, sendOtp, updateUser, verifyOtp } from './controllers/authController';
import productController from './controllers/productController';
import { authMiddleware } from './middleware/auth';
import { authorization, adminAuthorization } from './middleware/authorization';

const router = express.Router();
router.post('/auth/mobile/send-otp', sendOtp);
router.post('/auth/mobile/verify-otp', verifyOtp);
router.get('/user', authMiddleware, getUser);
router.put('/user/:userId', authMiddleware, authorization, updateUser);
router.patch('/user/:userId', authMiddleware, authorization, partialUpdateUser);
router.post('/products', authMiddleware, adminAuthorization, productController.createProduct);
router.get('/products', authMiddleware, productController.listProducts);
router.put('/products/:id', authMiddleware, adminAuthorization, productController.updateProduct);


export default router;
