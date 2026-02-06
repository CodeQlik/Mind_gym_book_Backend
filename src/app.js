import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/v1/users', userRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to Mind Gym Book API (Restructured Edition)');
});

app.use(errorMiddleware);

export { app };
