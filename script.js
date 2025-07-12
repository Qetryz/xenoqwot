// --- ОБЪЯВЛЕНИЕ ПЕРЕМЕННЫХ ---
// Получаем все нужные элементы со страницы сразу
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');
const loginContainer = document.querySelector('.login-container');
const siteContent = document.getElementById('site-content');
const loginForm = document.getElementById('login-form');
const messageEl = document.getElementById('message');
const logoutButton = document.getElementById('logout-button');
const welcomeMessage = document.getElementById('welcome-message');

// --- ЛОГИКА АНИМАЦИИ ---
// Настраиваем холст
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


// Символы и настройки "Матрицы"
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const charArray = chars.split('');
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = [];
for (let x = 0; x < columns; x++) {
    drops[x] = 1;
}

// Функция отрисовки одного кадра анимации
function draw() {
    // Полупрозрачный фон для эффекта "хвоста" у символов
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff88'; // Цвет символов
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0; // Сбрасываем "каплю" наверх
        }
        drops[i]++;
    }
}

// --- ЛОГИКА АУТЕНТИФИКАЦИИ ---

// Функция для отображения сайта (когда пользователь вошел)
function showSite(username) {
    welcomeMessage.textContent = `Добро пожаловать, ${username}!`;
    loginContainer.classList.add('hidden');
    siteContent.classList.remove('hidden');
}

// Функция для отображения формы входа
function showLogin() {
    loginContainer.classList.remove('hidden');
    siteContent.classList.add('hidden');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
}

// --- ЗАПУСК ВСЕГО ---

// 1. Сначала вешаем все обработчики событий
// Обработчик формы (регистрация или вход)
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const action = event.submitter.value;
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    const username = loginForm.username.value;
    messageEl.textContent = '';

    let endpoint = action === 'register' ? '/api/register' : '/api/login';
    let body = action === 'register' ? { email, username, password } : { email, password };

    if (action === 'register' && !username) {
        messageEl.textContent = 'Для регистрации нужен никнейм!';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();

        if (response.ok) {
            if (action === 'login') {
                localStorage.setItem('token', result.token);
                localStorage.setItem('username', result.username);
                showSite(result.username);
            } else {
                messageEl.style.color = '#00ff88';
                messageEl.textContent = result.message;
            }
        } else {
            messageEl.style.color = '#ff4d4d';
            messageEl.textContent = result.message;
        }
    } catch (error) {
        messageEl.style.color = '#ff4d4d';
        messageEl.textContent = 'Ошибка сети. Проверьте, запущен ли сервер.';
    }
});

// Обработчик для кнопки "Выйти"
logoutButton.addEventListener('click', showLogin);

// 2. Проверяем, вошел ли пользователь, при загрузке страницы
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
if (token && username) {
    showSite(username);
} else {
    showLogin();
}

// 3. И только теперь запускаем анимацию в бесконечный цикл
setInterval(draw, 33);