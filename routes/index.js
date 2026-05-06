import validator from 'validator';

import { Router } from 'express';

import authRouter from './auth/index.js';
import jwt from '../functions/jwt.js';

const indexRouter = Router();

indexRouter.get('/', async (req, res) => {
    res.render('home');
});

indexRouter.get('/otp', async (req, res) => {
    const token = req.query.token;

    if (!token) return res.redirect('/');
    if (!validator.isJWT(token)) return res.redirect('/');

    const { email, error } = jwt.read(token);

    res.render('otp', { email, error });
});

indexRouter.use('/auth', authRouter);

export default indexRouter;
