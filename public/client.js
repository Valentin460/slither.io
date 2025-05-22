const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let playerId = null;
let players = {};
let food = [];
let snake = [];

let username = "";
let gameStarted = false;
let boosting = false;

const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
const touch = { x: canvas.width / 2, y: canvas.height / 2 };

const menu = document.getElementById("menu");
const usernameInput = document.getElementById("username");
const playBtn = document.getElementById("playBtn");

const savedName = localStorage.getItem("pseudo");
if (savedName) usernameInput.value = savedName;

window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener("mousedown", (e) => {
    if (e.button === 0) boosting = true;
});
  
window.addEventListener("mouseup", (e) => {
    if (e.button === 0) boosting = false;
});

canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
        const touchEvent = e.touches[0];
        touch.x = touchEvent.clientX;
        touch.y = touchEvent.clientY;
    }
});

playBtn.addEventListener("click", () => {
    const input = usernameInput.value.trim();
    if (input.length > 0) {
        username = input;
        localStorage.setItem("pseudo", username);
        socket.emit("setName", username);
        socket.emit("start", username);
        menu.style.display = "none";
        canvas.style.display = "block";
        gameStarted = true;
  }
});

socket.on("init", (data) => {
    playerId = data.id;
    food = data.food;
});

socket.on("players", (data) => {
    players = data;
});

socket.on("food", (data) => {
    food = data;
});

socket.on("dead", (score) => {
    if (!gameStarted) return;
    gameStarted = false;
    canvas.style.display = "none";

    const deathDiv = document.createElement("div");
    deathDiv.style.position = "absolute";
    deathDiv.style.top = "0";
    deathDiv.style.left = "0";
    deathDiv.style.right = "0";
    deathDiv.style.bottom = "0";
    deathDiv.style.background = "rgba(0,0,0,0.85)";
    deathDiv.style.color = "white";
    deathDiv.style.display = "flex";
    deathDiv.style.flexDirection = "column";
    deathDiv.style.justifyContent = "center";
    deathDiv.style.alignItems = "center";
    deathDiv.style.zIndex = "10";

    const title = document.createElement("h2");
    title.textContent = "Tu es mort !";

    const scoreText = document.createElement("p");
    scoreText.textContent = `Ton score : ${score}`;

    const btn = document.createElement("button");
    btn.textContent = "Rejouer";
    btn.style.padding = "10px 20px";
    btn.style.fontSize = "16px";
    btn.style.marginTop = "10px";

    btn.addEventListener("click", () => {
        window.location.reload();
    });

    deathDiv.appendChild(title);
    deathDiv.appendChild(scoreText);
    deathDiv.appendChild(btn);
    document.body.appendChild(deathDiv);
});

function drawCircle(x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawText(text, x, y, size = 16, color = "#fff") {
    ctx.fillStyle = color;
    ctx.font = `${size}px Arial`;
    ctx.fillText(text, x, y);
}

    function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted || !players[playerId]) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const me = players[playerId];

    if (snake.length < me.length) {
        const last = snake[snake.length - 1] || { x: me.x, y: me.y };
        for (let i = snake.length; i < me.length; i++) {
        snake.push({ x: last.x, y: last.y });
        }
    }

    const head = snake[0] || { x: me.x, y: me.y };
    const isTouch = 'ontouchstart' in window;
    const target = isTouch ? touch : mouse;
    const angle = Math.atan2(target.y - canvas.height / 2, target.x - canvas.width / 2);
    const speed = boosting ? 3 : 1.5;
    const newX = head.x + Math.cos(angle) * speed;
    const newY = head.y + Math.sin(angle) * speed;
    snake.unshift({ x: newX, y: newY });
    if (snake.length > me.length) snake.pop();

    socket.emit("update", {
        x: newX,
        y: newY,
        angle,
        snake,
        boosting
    });

    for (let i = 0; i < food.length; i++) {
        const f = food[i];
        const dist = Math.hypot(f.x - head.x, f.y - head.y);
        if (dist < 10) {
        socket.emit("eat", { x: f.x, y: f.y });
        break;
        }
    }

    food.forEach(f => {
        const dx = f.x - head.x + canvas.width / 2;
        const dy = f.y - head.y + canvas.height / 2;
        drawCircle(dx, dy, 5, "#ff0");
    });

    for (let id in players) {
        const p = players[id];
      
        for (let i = 0; i < p.snake.length; i++) {
            const seg = p.snake[i];
            const dx = seg.x - newX + canvas.width / 2;
            const dy = seg.y - newY + canvas.height / 2;
            drawCircle(dx, dy, 5, p.color);
        }
      
        if (p.snake.length > 0 && p.name) {
            const head = p.snake[0];
            const textX = head.x - newX + canvas.width / 2;
            const textY = head.y - newY + canvas.height / 2 - 10;
            drawText(p.name, textX, textY, 14, "#fff");
        }
      }

    const sorted = Object.entries(players).sort((a, b) => b[1].score - a[1].score);
    drawText("Scoreboard", canvas.width - 160, 30, 18);
    sorted.slice(0, 5).forEach(([id, p], index) => {
        const name = p.name || "Anonyme";
        drawText(`${name} : ${p.score}`, canvas.width - 160, 50 + index * 20, 14);
    });

    requestAnimationFrame(gameLoop);
    }

gameLoop();
