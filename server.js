const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // <-- ДОБАВИЛИ ЭТО

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-very-secret-key-that-no-one-knows'; // <-- Секретный ключ для токенов

// ... остальной код (app.use, mongoose.connect) остается без изменений ...
app.use(cors());
app.use(bodyParser.json());

const dbURI = 'mongodb+srv://savostam10:791835Sd@cluster0.899ha4l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // <-- Ваша строка подключения
mongoose.connect(dbURI)
    .then(() => console.log('MongoDB подключена...'))
    .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// ... роут /api/register остается без изменений ...
app.post('/api/register', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        return res.status(400).json({ message: 'Пожалуйста, заполните все поля' });
    }
    try {
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'Пользователь с таким email или ником уже существует' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({ email, username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'Регистрация прошла успешно!' });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


// --- ИЗМЕНЯЕМ РОУТ /api/login ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Пожалуйста, заполните все поля' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Неверные email или пароль' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Неверные email или пароль' });
        }
        
        // --- СОЗДАЕМ ТОКЕН ---
        const token = jwt.sign(
            { id: user.id, username: user.username }, // Данные, которые мы "зашиваем" в токен
            JWT_SECRET,                               // Наш секретный ключ
            { expiresIn: '1h' }                       // Время жизни токена (1 час)
        );

        // --- ОТПРАВЛЯЕМ ТОКЕН И ИМЯ ПОЛЬЗОВАТЕЛЯ НА ФРОНТЕНД ---
        res.status(200).json({ 
            message: `Добро пожаловать, ${user.username}!`,
            token: token,
            username: user.username
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});