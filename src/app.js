import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes.js';
import addressRoutes from './routes/address.routes.js';
import categoryRoutes from './routes/category.routes.js';
import bookRoutes from './routes/book.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';

const app = express();

const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-otp-token']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle pre-flight requests globally
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use('/api/v1/users', userRoutes);
app.use('/api/v1/user/addresses', addressRoutes);
app.use('/api/v1/category', categoryRoutes);
app.use('/api/v1/book', bookRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to Mind Gym Book API (Restructured Edition)');
});

app.use(errorMiddleware);

export { app };
