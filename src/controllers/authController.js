import bcrypt from "bcrypt";
import createHttpError from 'http-errors';
import { User } from '../models/user.js';
import { createSession, setSessionCookies } from '../services/auth.js';
import { Session } from "../models/session.js";
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/sendMail.js';
import handlebars from 'handlebars';
import path from 'node:path';
import fs from 'node:fs/promises';

export const registerUser = async (req, res) => {
  // 1. Отримуємо дані з тіла запиту
  const { email, password } = req.body;

  // 2. Перевіряємо, чи існує користувач
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createHttpError(400, 'Email in use');
  }

  // 3. Хешуємо пароль
const hashedPassword = await bcrypt.hash(password, 10);

// 4. Створюємо користувача
  const user = await User.create({
    email,
    password: hashedPassword,
  });

  // 5. Створюємо сесію
  const newSession = await createSession(user._id);

  // 6. Додаємо cookies у відповідь
  setSessionCookies(res, newSession);

  // 7. Повертаємо користувача
  res.status(201).json(user);
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Перевіряємо чи користувач з такою поштою існує
  const user = await User.findOne({ email });
  if (!user) {
    throw createHttpError(401, 'Invalid credentials');
  }

  // Порівнюємо хеші паролів
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createHttpError(401, 'Invalid credentials');
  }

  // Видаляємо стару сесію користувача
  await Session.deleteOne({ userId: user._id });

  // Створюємо нову сесію
  const newSession = await createSession(user._id);

  // Викликаємо, передаємо об'єкт відповіді та сесію
  setSessionCookies(res, newSession);

  res.status(200).json(user);
};

export const logoutUser = async (req, res) => {
  const { sessionId } = req.cookies;

  if (sessionId) {
    await Session.deleteOne({ _id: sessionId });
  }

  res.clearCookie('sessionId');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(204).send();
};

// Контролер refreshUserSession
export const refreshUserSession = async (req, res) => {
  const { sessionId, refreshToken } = req.cookies;

  if (!sessionId || !refreshToken) {
    throw createHttpError(401, 'Missing session credentials');
  }

  // 1. Знаходимо поточну сесію за id сесії та рефреш токеном
  const session = await Session.findOne({
    _id: sessionId,
    refreshToken,
  });

  // 2. Якщо такої сесії нема, повертаємо помилку
  if (!session) {
    throw createHttpError(401, 'Session not found');
  }

  // 3. Якщо сесія існує, перевіряємо валідність рефреш токена
  const isSessionTokenExpired = session.refreshTokenValidUntil < new Date();

  // Якщо термін дії рефреш токена вийшов,
  // видаляємо сесію і повертаємо помилку
  if (isSessionTokenExpired) {
	await session.deleteOne();
	res.clearCookie('sessionId');
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    throw createHttpError(401, 'Session token expired');
  }

  // 4. Якщо всі перевірки пройшли добре, видаляємо поточну сесію
	await session.deleteOne();

  // 5. Створюємо нову сесію та додаємо кукі
  const newSession = await createSession(session.userId);
  setSessionCookies(res, newSession);

  res.status(200).json({
    message: 'Session refreshed',
  });
};

// E-MAIL
export const requestResetEmail = async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json({
      message: 'If this email exists, a reset link has been sent',
    });
  }

  const resetToken = jwt.sign(
    { sub: user._id, email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );
console.log(resetToken);
	// 1. Формуємо шлях до шаблона
  const templatePath = path.resolve('src/templates/reset-password-email.html');
  // 2. Читаємо шаблон
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  // 3. Готуємо шаблон до заповнення
  const template = handlebars.compile(templateSource);
  // 4. Формуємо із шаблона HTML документ з динамічними даними
  const html = template({
    name: user.username,
    link: `${process.env.FRONTEND_DOMAIN}/reset-password?token=${resetToken}`,
  });

  try {
    await sendEmail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset your password',
      // 5. Передаємо HTML у функцію надписання пошти
      html,
    });
  } catch {
    throw createHttpError(500, 'Failed to send the email, please try again later.');
  }

  res.status(200).json({
    message: 'If this email exists, a reset link has been sent',
  });
};

// Контролер виконує чотири ключові кроки:
// перевіряє токен, знаходить користувача, хешує новий пароль і оновлює запис.
export const resetPassword = async (req, res) => {
	const { token, password } = req.body;

	// 1. Перевіряємо/декодуємо токен
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
	  // Повертаємо помилку якщо проблема при декодуванні
		throw createHttpError(401, 'Invalid or expired token');
  }

  // 2. Шукаємо користувача
  const user = await User.findOne({  _id: payload.sub,  email: payload.email });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  // 3. Якщо користувач існує
  // створюємо новий пароль і оновлюємо користувача
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.updateOne(
	  { _id: user._id },
	  { password: hashedPassword }
  );

  // 4. Інвалідовуємо всі можливі попередні сесії користувача
  await Session.deleteMany({ userId: user._id });

	// 5. Повертаємо успішну відповідь
  res.status(200).json({
    message: 'Password reset successfully. Please log in again.',
  });
};
