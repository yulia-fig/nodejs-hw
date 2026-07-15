// src/server.js
import express from 'express';
// Такий імпорт одразу ініціалізує бібліотеку
import 'dotenv/config';
import cors from 'cors';
import { errors } from "celebrate";
import { connectMongoDB } from './db/connectMongoDB.js';
import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import notesRoutes from './routes/notesRoutes.js';


// Решта коду
const app = express();

// Використовуємо значення з .env або дефолтний порт 3000
const PORT = process.env.PORT ?? 3000;

// Middleware
app.use(logger);
app.use(express.json()); // Дозволяє роботу з файлами json
app.use(cors()); // Дозволяє запити з будь-яких джерел
// Дозволяє відстежувати як працює застосунок: які запити надходять

// підключаємо групу маршрутів студента
app.use(notesRoutes);

// Middleware 404 (після всіх маршрутів)
app.use(notFoundHandler);

// обробка помилок від celebrate (валідація)
app.use(errors());

// Middleware для обробки помилок 500
app.use(errorHandler);

await connectMongoDB();

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
