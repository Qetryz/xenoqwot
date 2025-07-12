const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key-that-no-one-knows';
const dbURI = process.env.MONGODB_URI || 'mongodb+srv://savostam10:791835Sd@cluster0.899ha4l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Для обслуживания статических файлов (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к MongoDB
mongoose.connect(dbURI)
    .then(() => console.log('MongoDB подключена...'))
    .catch(err => console.log(err));

// Схемы базы данных
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const PostSchema = new mongoose.Schema({
    username: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);
const Message = mongoose.model('Message', MessageSchema);

// Роут для главной страницы
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API роуты
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
        
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

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

// Роуты для постов
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.post('/api/posts', async (req, res) => {
    const { username, content } = req.body;
    try {
        const post = new Post({ username, content });
        await post.save();
        res.status(201).json(post);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Роуты для пользователей
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Роуты для сообщений
app.post('/api/messages', async (req, res) => {
    const { sender, receiver, content } = req.body;
    try {
        const message = new Message({ sender, receiver, content });
        await message.save();
        res.status(201).json(message);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.get('/api/messages/:user1/:user2', async (req, res) => {
    const { user1, user2 } = req.params;
    try {
        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.get('/api/chats/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const chats = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: username },
                        { receiver: username }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$sender', username] },
                            '$receiver',
                            '$sender'
                        ]
                    },
                    lastMessage: { $last: '$timestamp' }
                }
            },
            {
                $project: {
                    participants: [username, '$_id'],
                    lastMessage: 1
                }
            }
        ]);
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
