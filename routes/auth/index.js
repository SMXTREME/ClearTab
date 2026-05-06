import validator from 'validator';

import { Router } from 'express';

import jwt from '../../functions/jwt.js';

const authRouter = Router();

authRouter.post('/auth/send-otp', async (req, res) => {
    try {
        const email = req.body.email;

        if (!email) return res.redirect('/?error=Email is required');

        const trimmedEmail = String(email).trim();

        if (!validator.isEmail(trimmedEmail)) {
            return res.redirect('/?error=Invalid email address');
        }

        const normalizedEmail = validator.normalizeEmail(trimmedEmail);

        const otpQuery = { email, error: undefined };

        const token = await jwt.write(otpQuery);

        res.redirect(`/otp?token=${token}`);
    } catch (err) {
        console.log('Error in /auth/send-otp:\n', err);
    }
});

authRouter.post('/auth/verify-otp', async (req, res) => {
    try {
        const otp = '123456';
        const email = req.body.email;

        console.log(req.body.otp);

        if (email === req.body.email && otp === req.body.otp) {
            res.redirect('/dashboard');
        } else {
            res.redirect(`/otp?email=${email}&error=Invalid or expired code.`);
        }
    } catch (err) {
        console.log('Error in /auth/verify-otp:\n', err);
    }
});

export default authRouter;
