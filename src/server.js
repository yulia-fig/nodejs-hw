// src/server.js
import express from 'express';
import cors from 'cors';
import pino from 'pino-http';

// Такий імпорт одразу ініціалізує бібліотеку
import 'dotenv/config';


// Решта коду
const app = express();

app.use(express.json());
app.use(cors()); // Дозволяє запити з будь-яких джерел
app.use(
  pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{req.method} {req.url} {res.statusCode} - {responseTime}ms',
        hideObject: true,
      },
    },
  }),
);

// Використовуємо значення з .env або дефолтний порт 3000
const PORT = process.env.PORT ?? 3000;

// Перший маршрут
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello world!' });
});

app.get('/user', (req, res) => {
  res.status(200).json({ message: 'Hello user!' });
});

app.get('/user/:userId/:name/:age', (req, res) => {
  const { userId, name, age } = req.params;
  res.status(200).json({ id: userId, name: name, age: age});
});

// Middleware для обробки помилок
app.use((err, req, res, next) => {
  console.error(err);

  const isProd = process.env.NODE_ENV === "production";

  res.status(500).json({
    message: isProd
      ? "Something went wrong. Please try again later."
      : err.message,
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
