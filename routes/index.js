import validator from 'validator';

import { Router } from 'express';

import authRouter from './auth/index.js';
import jwt from '../functions/jwt.js';

const indexRouter = Router();

indexRouter.get('/', async (req, res) => {
    const token = req.query?.token;

    let email, error;

    if (token) {
        if (!validator.isJWT(token)) return res.redirect('/');
        const data = await jwt.read(token);
        email = data.email;
        error = data.error;
    }

    res.render('home', { email, error });
});

indexRouter.get('/otp', async (req, res) => {
    const token = req.query.token;

    if (!token) return res.redirect('/');
    if (!validator.isJWT(token)) return res.redirect('/');

    const { email, error } = await jwt.read(token);

    res.render('otp', { email, error });
});

indexRouter.use('/auth', authRouter);

export default indexRouter;
