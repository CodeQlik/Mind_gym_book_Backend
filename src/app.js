import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import userRoutes from './routes/userRoutes.js';
import addressRoutes from './routes/addressRoutes.js';

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/addresses', addressRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to Mind Gym Book API (Sequelize Edition)');
});

export { app };
