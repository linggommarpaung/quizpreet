// ~/quizpreet/server/index.js

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Base Route untuk memastikan server berjalan
app.get('/', (req, res) => {
    res.send('Server Quizpreet Berjalan!');
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`[BACKEND] Server Quizpreet berjalan di port ${PORT}`);
});
