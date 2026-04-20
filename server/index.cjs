require('dotenv').config();
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

// Log middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// Helper to read DB
const readDB = () => {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
};

// Helper to write DB
const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// Helper to read logo and convert to base64
const getLogoBase64 = () => {
    try {
        // Use PNG for better email compatibility (Gmail doesn't support SVG base64)
        const logoPath = path.join(__dirname, '..', 'src', 'assets', 'brand-logo-new.png');
        if (!fs.existsSync(logoPath)) {
             // fallback to SVG if PNG not found (though PNG is preferred)
             const svgPath = path.join(__dirname, '..', 'src', 'assets', 'brand-logo-new.svg');
             const svgData = fs.readFileSync(svgPath);
             return `data:image/svg+xml;base64,${svgData.toString('base64')}`;
        }
        const logoData = fs.readFileSync(logoPath);
        return `data:image/png;base64,${logoData.toString('base64')}`;
    } catch (e) {
        console.error('Erro ao carregar logo:', e.message);
        return null;
    }
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

    // Setup Real Gmail SMTP
    try {
        let transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: process.env.SMTP_PORT || 465,
            secure: true, 
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const logoBase64 = getLogoBase64();
        const html = forgotPasswordTemplate(otp, logoBase64);

        await transporter.sendMail({
            from: '"Studio Solart" <' + process.env.SMTP_USER + '>',
            to: email,
            subject: "Recuperação de Senha - Código de Validação",
            html: html,
        });

        console.log(`[${new Date().toLocaleTimeString()}] E-mail enviado para: ${email}`);
        
        res.json({ 
            message: 'Código enviado com sucesso para sua caixa de entrada!' 
        });
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).json({ title: 'Erro de E-mail', message: 'Não foi possível enviar o e-mail. Verifique se as credenciais no .env estão corretas.' });
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
