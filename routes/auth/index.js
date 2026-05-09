import validator from 'validator';

import { Router } from 'express';

import redis from '../../redis.js';
import User from '../../schema/User.js';
import jwt from '../../functions/jwt.js';
import sendOtpEmail from '../../functions/otpMailing.js';
import sendWelcomeEmail from '../../functions/welcomeMailer.js';

const authRouter = Router();

authRouter.post('/send-otp', async (req, res) => {
    try {
        const email = req.body.email;
        if (!email) {
            const requiredEmailQuery = { email, error: 'Email is required' };
            const requiredEmailQueryToken = await jwt.write(requiredEmailQuery);
            res.redirect(`/?token=${requiredEmailQueryToken}`);
            return;
        }

        const trimmedEmail = String(email).trim();
        if (!validator.isEmail(trimmedEmail)) {
            const validEmailQuery = { email, error: 'Please enter a valid email address' };
            const validEmailQueryToken = await jwt.write(validEmailQuery);
            res.redirect(`/?token=${validEmailQueryToken}`);
            return;
        }

        const normalizedEmail = validator.normalizeEmail(trimmedEmail);

        if (req.cookies?.authToken) {
            const data = await jwt.read(req.cookies.authToken);
            const cookieeEmail = data.email;

            if (cookieeEmail === normalizedEmail) {
                res.redirect('/dashboard');
                return;
            }
        }

        const otpQuery = { email: normalizedEmail, error: undefined };
        const token = await jwt.write(otpQuery);

        const OTP = Math.floor(100000 + Math.random() * 900000);
        await redis.set(normalizedEmail, JSON.stringify({ otp: OTP, tries: 0 }), 'EX', 300);
        const data = await sendOtpEmail(email, OTP);

        res.redirect(`/otp?token=${token}`);
    } catch (err) {
        console.error('Error in /auth/send-otp:\n', err);
        res.status(500).send('Something went wrong. Please try again.');
    }
});

authRouter.post('/verify-otp', async (req, res) => {
    try {
        const email = req.body.email;
        const otpByUser = req.body.otp;
        let redisData = await redis.get(email);

        const otpQuery = { email, error: 'Invalid or expired code.' };

        const token = await jwt.write(otpQuery);

        if (!redisData) return res.redirect(`/otp?token=${token}`);

        redisData = await JSON.parse(redisData);

        let { otp: actualOtp, tries: attempts } = redisData;

        if (otpByUser === `${actualOtp}` && attempts < 3) {
            let user = await User.findOne({ email });
            let newUserMail = false;

            if (!user) {
                user = await new User({
                    email,
                    userName: email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_'),
                })
                    .save()
                    .catch((err) => {
                        console.log('Error Saving New User:\n', err);
                        throw err;
                    });
                newUserMail = true;
            }

            await redis.del(email);

            res.cookie(
                'authToken',
                await jwt.write({ email, userName: user.userName, userId: user._id }),
                {
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                },
            );

            if (newUserMail) {
                await sendWelcomeEmail(user.email, user.userName);
            }

            res.redirect('/dashboard');
        } else {
            if (attempts + 1 <= 3) {
                await redis.set(
                    email,
                    JSON.stringify({ otp: actualOtp, tries: attempts + 1 }),
                    'KEEPTTL',
                );
            }

            res.redirect(`/otp?token=${token}`);
        }
    } catch (err) {
        console.log('Error in /auth/verify-otp:\n', err);
        res.status(500).send('Something went wrong. Please try again.');
    }
});

authRouter.get('/logout', async (req, res) => {
    res.clearCookie('authToken');
    res.redirect('/');
});

export default authRouter;
