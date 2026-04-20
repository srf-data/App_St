const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { forgotPasswordTemplate } = require('./mailTemplates.cjs');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'solart_secret_key_123';
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Helper to read DB
const readDB = () => {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// In-memory OTP storage (for production use a DB or Redis)
const otps = new Map();

// --- Auth Endpoints ---

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ title: 'Usuário não encontrado', message: 'O e-mail informado não está cadastrado.' });
    }

    const isValid = await bcrypt.compare(password, user.senha);
    if (!isValid) {
        return res.status(401).json({ title: 'Senha Incorreta', message: 'A senha inserida não corresponde ao e-mail.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    
    // Update last access
    user.ultimoAcc = new Date().toLocaleString('pt-BR');
    writeDB(db);

    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, foto: user.foto, ultimoAcc: user.ultimoAcc } });
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ title: 'Erro', message: 'E-mail não encontrado.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(email, { otp, expires: Date.now() + 15 * 60 * 1000 });

    // Setup Ethereal (Test Service)
    try {
        let testAccount = await nodemailer.createTestAccount();
        let transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });

        const html = forgotPasswordTemplate(otp);

        let info = await transporter.sendMail({
            from: '"St. Solart" <noreply@studiosolart.com>',
            to: email,
            subject: "Recuperação de Senha - Código de Validação",
            html: html,
        });

        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        
        res.json({ 
            message: 'Código enviado!', 
            previewUrl: nodemailer.getTestMessageUrl(info) // Send preview URL for visual testing
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ title: 'Erro de E-mail', message: 'Não foi possível enviar o e-mail de recuperação.' });
    }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const entry = otps.get(email);

    if (!entry) return res.status(400).json({ message: 'Código expirado ou não solicitado.' });
    if (entry.expires < Date.now()) {
        otps.delete(email);
        return res.status(400).json({ message: 'Código expirado.' });
    }
    if (entry.otp !== otp) return res.status(400).json({ message: 'Código incorreto.' });

    // Mark as verified (optional: use a secure session token instead)
    res.json({ message: 'Código validado com sucesso!' });
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const entry = otps.get(email);

    if (!entry || entry.otp !== otp) {
        return res.status(401).json({ message: 'Validação inválida.' });
    }

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.email === email);
    if (userIndex === -1) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.users[userIndex].senha = hashed;
    writeDB(db);

    otps.delete(email);
    res.json({ message: 'Senha alterada com sucesso!' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
