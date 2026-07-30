// server/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allow your Vite frontend to securely send requests to this backend
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: "alive", message: "Zim Marketplace API Engine Operational" });
});

app.listen(PORT, () => {
    console.log(`🚀 Marketplace Backend cluster active on port ${PORT}`);
});