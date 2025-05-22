const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const MAP_SIZE = 4000;
const MAP_MIN = -MAP_SIZE / 2;
const MAP_MAX = MAP_SIZE / 2;

const PORT = 3000;
app.use(express.static("public"));

let players = {};
let food = [];

function generateFood(n = 500) {
    food = [];
    for (let i = 0; i < n; i++) {
        food.push({
            x: Math.random() * MAP_SIZE - MAP_SIZE / 2,
            y: Math.random() * MAP_SIZE - MAP_SIZE / 2
        });
    }
}

io.on("connection", (socket) => {
    console.log("Waiting for player to start:", socket.id);

    socket.on("start", (name) => {
        players[socket.id] = {
            x: 0,
            y: 0,
            angle: 0,
            snake: [],
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            length: 30,
            score: 0,
            name: name || "Anonyme"
        };

    console.log(`Player started: ${socket.id} (${name})`);
    socket.emit("init", { id: socket.id, food });
    io.emit("players", players);
    io.emit("food", food);
  });

  socket.on("eat", (pos) => {
    food = food.filter(f => {
        const dist = Math.hypot(f.x - pos.x, f.y - pos.y);
        return dist > 15;
    });

    while (food.length < 500) {
        food.push({
            x: Math.random() * MAP_SIZE - MAP_SIZE / 2,
            y: Math.random() * MAP_SIZE - MAP_SIZE / 2
      });
    }

    if (players[socket.id]) {
        players[socket.id].length += 2;
        players[socket.id].score += 1;
    }

    io.emit("food", food);
  });

  socket.on("update", (data) => {
    if (players[socket.id]) {
        players[socket.id] = {
            ...players[socket.id],
            ...data
        };
    
        if (data.boosting && players[socket.id].length > 10) {
            players[socket.id].length -= 0.1;
        }
        }
  });

  socket.on("disconnect", () => {
        const name = players[socket.id]?.name || "Unknown";
        console.log(`Player disconnected: ${socket.id} (${name})`);
        delete players[socket.id];
        io.emit("players", players);
    });
});

setInterval(() => {
    for (const [id1, p1] of Object.entries(players)) {
        const head = p1.snake[0];
        if (!head) continue;

        for (const [id2, p2] of Object.entries(players)) {
        if (id1 === id2) continue;

        for (let i = 1; i < p2.snake.length; i++) {
            const seg = p2.snake[i];
            const dist = Math.hypot(seg.x - head.x, seg.y - head.y);
            if (dist < 6) {
            console.log(`Player ${id1} (${p1.name}) died by hitting ${id2} (${p2.name})`);

            io.to(id1).emit("dead", p1.score);

            food.push(...p1.snake.map(pos => ({
                x: pos.x + (Math.random() - 0.5) * 10,
                y: pos.y + (Math.random() - 0.5) * 10
            })));

            delete players[id1];
            break;
            }
        }
        }
    }

    io.emit("players", players);
    io.emit("food", food);
}, 50);

generateFood();
http.listen(PORT, () => console.log("Server on http://localhost:" + PORT));
