import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import redis from './redis.js';
import indexRouter from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env?.PORT || 6767;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw Error('MONGODB_URI is a required environment variable');
}

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await mongoose.connect(MONGODB_URI).catch((err) => console.log(err));
console.log('Clear Tab Connected to DB');

app.listen(PORT, () => console.log('Clear Tab is live on http://localhost:6767'));

app.use('/', indexRouter);
