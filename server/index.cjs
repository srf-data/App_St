require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { forgotPasswordTemplate } = require('./mailTemplates.cjs');

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const pkg = require('@prisma/client');
const { PrismaClient, Prisma } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const units = {
    // Volume
    'ml': 1, 'ml.': 1, 'mililitro': 1, 'mililitros': 1,
    'l': 1000, 'litro': 1000, 'litros': 1000,
    '100ml': 100,
    // Massa
    'g': 1, 'grama': 1, 'gramas': 1,
    'kg': 1000, 'quilo': 1000, 'quilos': 1000, 'kilo': 1000,
    // Unidade
    'un': 1, 'unid': 1, 'unidade': 1, 'unidades': 1
};

const getFactor = (unit) => {
    if (!unit) return 1;
    const u = unit.toLowerCase().trim();
    return units[u] || 1;
};

const calculatePropCost = (price, unitOrig, qty, unitUsed) => {
    const fOrig = getFactor(unitOrig);
    const fUsed = getFactor(unitUsed);
    const pricePerBase = Number(price) / fOrig;
    const qtyInBase = Number(qty) * fUsed;
    return qtyInBase * pricePerBase;
};

const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'solart_secret_key_123_dev_only';
if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET environment variable is not set. Using a default development secret.');
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('[AUTH] Token inválido:', err.message);
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
};

const DB_PATH = path.join(__dirname, 'db.json');

async function recalcularPrecosProdutos(prismaInstance) {
    console.log('[Sincronização] Iniciando recálculo de todos os produtos...');
    const produtos = await prismaInstance.produto.findMany({
        include: { custos: { include: { insumo: true } } }
    });

    for (const p of produtos) {
        let novoCustoTotal = 0;
        for (const c of p.custos) {
            if (c.insumo) {
                const precoProp = calculatePropCost(
                    c.insumo.Custo_insumo,
                    c.insumo.unidade,
                    c.Qtd_Utilizada,
                    c.Unidade
                );
                novoCustoTotal += precoProp;
            }
        }

        console.log(`[Sync] Produto ${p.Cod_Produto}: Custo ${novoCustoTotal.toFixed(4)}`);

        await prismaInstance.produto.update({
            where: { Cod_Produto: p.Cod_Produto },
            data: {
                Custo_Produto: novoCustoTotal
            }
        });
    }
    console.log('[Sincronização] Recálculo concluído com sucesso.');
}

const mapSaidaProdutoParaFrontend = (s) => ({
    id: `P-${s.Cod_Saida_Prod}`,
    produtoId: s.Cod_Produto,
    produto: s.Nome_Produto || '',
    cliente: s.Nome_Cliente || '',
    qtde: Number(s.Quantidade || 0),
    valorUnitario: Number(s.Valor_Unitario || 0),
    desconto: Number(s.Desconto || 0),
    total: s.Total ? `R$ ${Number(s.Total).toFixed(2).replace('.', ',')}` : 'R$ 0,00',
    totalNum: Number(s.Total || 0),
    status: s.Status || 'pendente',
    data: new Date(s.DtSaida).toLocaleDateString('pt-BR')
});

const mapSaidaInsumoParaFrontend = (s) => ({
    id: `I-${s.Cod_Saida_Insumo}`,
    insumoId: s.Cod_Insumo,
    nome: s.Nome_Insumo || '',
    qtde: Number(s.Quantidade || 0),
    status: s.Status || 'saída',
    data: new Date(s.DtSaida).toLocaleDateString('pt-BR')
});

const mapUsuarioParaFrontend = (u) => ({
    id: u.Cod_Usuario,
    nome: u.Nome_Usuario || '',
    email: u.email || '',
    senha: u.senha || '',
    foto: u.foto || null,
    dataCad: u.Dt_Cadastro ? new Date(u.Dt_Cadastro).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
    ultimoAcc: u.Ultimo_Acesso ? new Date(u.Ultimo_Acesso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca'
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const logError = (err, req) => {
    const logEntry = `[${new Date().toISOString()}] ERROR: ${err.message}\n` +
                     `Method: ${req.method}\n` +
                     `URL: ${req.url}\n` +
                     `Body: ${JSON.stringify(req.body)}\n` +
                     `Stack: ${err.stack}\n` +
                     `-----------------------------------\n`;
    fs.appendFileSync(path.join(__dirname, 'error_log.txt'), logEntry);
    console.error('--- ERRO DETECTADO ---');
    console.error(err);
};

app.get('/api/status', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: e.message });
    }
});

app.get('/api/usuarios', authenticateToken, async (req, res) => {
    try {
        const users = await prisma.usuarios.findMany({ orderBy: { Cod_Usuario: 'asc' } });
        res.json(users.map(mapUsuarioParaFrontend));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
});

app.post('/api/usuarios', authenticateToken, async (req, res) => {
    const { nome, email, senha, foto } = req.body;
    try {
        const hashed = await bcrypt.hash(senha, 10);
        const newUser = await prisma.usuarios.create({
            data: {
                Nome_Usuario: nome,
                email: email,
                senha: hashed,
                foto: foto
            }
        });
        res.json(mapUsuarioParaFrontend(newUser));
    } catch (e) {
        console.error(e);
        if (e.code === 'P2002') return res.status(400).json({ error: 'Este e-mail já está em uso.' });
        res.status(500).json({ error: 'Erro ao criar usuário.' });
    }
});

app.put('/api/usuarios/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, foto } = req.body;
    try {
        const updateData = {
            Nome_Usuario: nome,
            email: email,
            foto: foto
        };

        if (senha && senha.trim() !== '') {
            updateData.senha = await bcrypt.hash(senha, 10);
        }

        const updated = await prisma.usuarios.update({
            where: { Cod_Usuario: Number(id) },
            data: updateData
        });
        res.json(mapUsuarioParaFrontend(updated));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
});

app.delete('/api/usuarios/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.usuarios.delete({ where: { Cod_Usuario: Number(id) } });
        res.json({ message: 'Usuário removido com sucesso.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao remover usuário.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.usuarios.findUnique({
            where: { email: email }
        });

        if (!user) {
            return res.status(401).json({ 
                title: 'E-mail não encontrado', 
                message: 'O e-mail informado não está cadastrado.' 
            });
        }

        // Use bcrypt to verify password
        const isValid = await bcrypt.compare(password, user.senha);

        if (!isValid) {
            return res.status(401).json({ 
                title: 'Senha Incorreta', 
                message: 'A senha inserida não corresponde ao e-mail.' 
            });
        }

        const token = jwt.sign({ id: user.Cod_Usuario, email: user.email }, JWT_SECRET, { expiresIn: '1d' });

        await prisma.usuarios.update({
            where: { Cod_Usuario: user.Cod_Usuario },
            data: { Ultimo_Acesso: new Date() }
        });

        res.json({ 
            token,
            user: mapUsuarioParaFrontend(user)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao processar login.' });
    }
});

const getLogoBase64 = () => {
    try {
        const logoPath = path.join(__dirname, '..', 'src', 'assets', 'brand-logo-new.png');
        if (!fs.existsSync(logoPath)) {
             const svgPath = path.join(__dirname, '..', 'src', 'assets', 'brand-logo-new.svg');
             if (!fs.existsSync(svgPath)) return null;
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

const otps = new Map();


// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await prisma.usuarios.findUnique({ where: { email: email } });

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
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const logoBase64 = getLogoBase64();
        const html = forgotPasswordTemplate(otp, logoBase64);

        await transporter.sendMail({
            from: `"Studio Solart" <${process.env.EMAIL_USER}>`,
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

app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const entry = otps.get(email);

    if (!entry || entry.otp !== otp) {
        return res.status(401).json({ message: 'Validação inválida.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.usuarios.update({
        where: { email: email },
        data: { senha: hashed }
    });

    otps.delete(email);
    res.json({ message: 'Senha alterada com sucesso!' });
});

const mapFornecedorParaFrontend = (f) => ({
  id: f.Cod_Fornecedor,
  razaoSocial: f.Razao_Social || '',
  fantasia: f.Nome_Fornecedor || '',
  cnpj: f.CNPJ ? String(f.CNPJ).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : '00.000.000/0000-00',
  cidade: f.Cidade || '',
  estado: f.UF || '',
  contato: f.Contato || ''
});

app.get('/api/fornecedores', authenticateToken, async (req, res) => {
    try {
        const fornecedores = await prisma.fornecedores.findMany({ orderBy: { Cod_Fornecedor: 'desc' } });
        res.json(fornecedores.map(mapFornecedorParaFrontend));
    } catch (e) {
        console.error('Erro GET Fornecedores:', e);
        res.status(500).json({ error: 'Erro ao buscar fornecedores do banco.' });
    }
});

app.post('/api/fornecedores', authenticateToken, async (req, res) => {
    const { razaoSocial, fantasia, cnpj, cidade, estado, contato } = req.body;
    try {
        const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : null;
        const cnpjNum = cnpjLimpo && cnpjLimpo !== '00000000000000' && cnpjLimpo !== '' ? BigInt(cnpjLimpo) : null;
        
        const criado = await prisma.fornecedores.create({
            data: {
                Razao_Social: razaoSocial,
                Nome_Fornecedor: fantasia,
                CNPJ: cnpjNum,
                Cidade: cidade,
                UF: estado,
                Contato: contato
            }
        });
        res.json(mapFornecedorParaFrontend(criado));
    } catch (e) {
        console.error('Erro POST Fornecedores:', e);
        res.status(500).json({ error: 'Erro ao criar fornecedor.' });
    }
});

app.put('/api/fornecedores/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { razaoSocial, fantasia, cnpj, cidade, estado, contato } = req.body;
    try {
        const cnpjLimpo = cnpj ? cnpj.replace(/\D/g, '') : null;
        const cnpjNum = cnpjLimpo && cnpjLimpo !== '00000000000000' && cnpjLimpo !== '' ? BigInt(cnpjLimpo) : null;

        const atualizado = await prisma.fornecedores.update({
            where: { Cod_Fornecedor: Number(id) },
            data: {
                Razao_Social: razaoSocial,
                Nome_Fornecedor: fantasia,
                CNPJ: cnpjNum,
                Cidade: cidade,
                UF: estado,
                Contato: contato
            }
        });
        res.json(mapFornecedorParaFrontend(atualizado));
    } catch (e) {
        console.error('Erro PUT Fornecedores:', e);
        res.status(500).json({ error: 'Erro ao atualizar fornecedor.' });
    }
});

app.delete('/api/fornecedores/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.fornecedores.delete({
            where: { Cod_Fornecedor: Number(id) }
        });
        res.json({ message: 'Fornecedor apagado com sucesso' });
    } catch (e) {
        console.error('Erro DELETE Fornecedores:', e);
        res.status(500).json({ error: 'Erro ao apagar fornecedor.' });
    }
});

const mapInsumoParaFrontend = (i) => {
  const precoEmb = i.Preco_Embalagem ? Number(i.Preco_Embalagem) : null;
  const tamEmb = i.Tamanho_Embalagem ? Number(i.Tamanho_Embalagem) : null;
  
  return {
    id: i.Cod_Insumo,
    nome: i.Nome_Insumo || '',
    fornecedor: i.fornecedor && i.fornecedor.Nome_Fornecedor ? i.fornecedor.Nome_Fornecedor : '',
    fornecedorId: i.Cod_Fornecedor,
    unidade: i.unidade || '',
    custoUnitario: i.Custo_insumo ? Number(i.Custo_insumo) : 0,
    precoEmbalagem: precoEmb !== null ? precoEmb : Number(i.Custo_insumo || 0),
    tamanhoEmbalagem: tamEmb !== null ? tamEmb : 1,
    estoqueAtual: i.Estoque || 0,
    precos: [{ valor: i.Custo_insumo ? Number(i.Custo_insumo) : 0, data: i.Dt_Cadastro ? new Date(i.Dt_Cadastro).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR') }],
    foto: i.foto || '',
    dataCad: i.Dt_Cadastro ? new Date(i.Dt_Cadastro).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
  };
};

app.get('/api/insumos', authenticateToken, async (req, res) => {
    try {
        const insumos = await prisma.insumo.findMany({
            include: { fornecedor: true },
            orderBy: { Cod_Insumo: 'desc' }
        });
        console.log(`[GET /api/insumos] Enviando ${insumos.length} itens. Fotos:`, insumos.map(i => ({ id: i.Cod_Insumo, temFoto: !!i.foto, len: i.foto?.length || 0 })));
        res.json(insumos.map(mapInsumoParaFrontend));
    } catch (e) {
        console.error('Erro GET Insumos:', e);
        res.status(500).json({ error: 'Erro ao buscar insumos.' });
    }
});

app.post('/api/insumos', authenticateToken, async (req, res) => {
    console.log('[POST /api/insumos] Payload recebido:', { ...req.body, foto: req.body.foto ? `(Len: ${req.body.foto.length}, Inicio: ${req.body.foto.substring(0, 50)}...)` : 'vazio' });
    const { nome, unidade, custoUnitario, fornecedorId, estoqueAtual, precoEmbalagem, tamanhoEmbalagem, foto } = req.body;
    
    const qty = parseFloat(estoqueAtual) || 0;
    const pEmbalagem = parseFloat(precoEmbalagem) || parseFloat(custoUnitario) || 0;
    const tEmbalagem = parseFloat(tamanhoEmbalagem) || 1;
    const unitPrice = pEmbalagem / tEmbalagem;
    const fid = (fornecedorId && !isNaN(parseInt(fornecedorId)) && parseInt(fornecedorId) > 0) ? parseInt(fornecedorId) : null;

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const criado = await tx.insumo.create({
                data: {
                    Nome_Insumo: nome || 'Sem Nome',
                    unidade: unidade || 'unid',
                    Custo_insumo: unitPrice,
                    Preco_Embalagem: pEmbalagem,
                    Tamanho_Embalagem: tEmbalagem,
                    Estoque: qty,
                    Cod_Fornecedor: fid,
                    foto: foto || null
                },
                include: { fornecedor: true }
            });

            if (qty > 0) {
                await tx.entradaInsumos.create({
                    data: {
                        Cod_Insumo: criado.Cod_Insumo,
                        Nome_Insumo: nome || 'Sem Nome',
                        Nome_Fornecedor: criado.fornecedor ? criado.fornecedor.Nome_Fornecedor : 'Sem Fornecedor',
                        Quantidade: qty,
                        Valor_Unitario: unitPrice,
                        Desconto: 0,
                        Total: qty * unitPrice,
                        DtEntrada: new Date()
                    }
                });
            }
            return criado;
        });

        // RECALCULAR PRODUTOS AFETADOS
        try {
            await recalcularPrecosProdutos(prisma);
        } catch (e) {
            console.error('Erro ao recalcular produtos após POST insumo:', e);
        }

        res.json(mapInsumoParaFrontend(resultado));
    } catch (e) {
        console.error('--- ERRO CRÍTICO POST INSUMOS ---');
        console.error('Payload:', req.body);
        console.error('Erro:', e);
        res.status(500).json({ 
            error: 'Erro interno ao salvar insumo.', 
            details: e.message,
            code: e.code 
        });
    }
});

app.put('/api/insumos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log(`[PUT /api/insumos/${id}] Payload recebido:`, { ...req.body, foto: req.body.foto ? `(Len: ${req.body.foto.length}, Inicio: ${req.body.foto.substring(0, 50)}...)` : 'vazio' });
    const { nome, unidade, custoUnitario, fornecedorId, estoqueAtual, precoEmbalagem, tamanhoEmbalagem, foto } = req.body;
    
    const pEmbalagem = parseFloat(precoEmbalagem) || parseFloat(custoUnitario) || 0;
    const tEmbalagem = parseFloat(tamanhoEmbalagem) || 1;
    const unitPrice = pEmbalagem / tEmbalagem;

    try {
        const atualizado = await prisma.insumo.update({
            where: { Cod_Insumo: Number(id) },
            data: {
                Nome_Insumo: nome,
                unidade: unidade,
                Custo_insumo: unitPrice,
                Preco_Embalagem: pEmbalagem,
                Tamanho_Embalagem: tEmbalagem,
                Estoque: parseFloat(estoqueAtual) || 0,
                Cod_Fornecedor: (fornecedorId && !isNaN(parseInt(fornecedorId))) ? parseInt(fornecedorId) : null,
                foto: foto !== undefined ? foto : undefined
            },
            include: { fornecedor: true }
        });
        // RECALCULAR PRODUTOS AFETADOS
        try {
            await recalcularPrecosProdutos(prisma);
        } catch (e) {
            console.error('Erro ao recalcular produtos após PUT insumo:', e);
        }

        res.json(mapInsumoParaFrontend(atualizado));
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message, details: 'Erro ao atualizar insumo' });
    }
});

app.delete('/api/insumos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.insumo.delete({
            where: { Cod_Insumo: Number(id) }
        });
        
        // RECALCULAR PRODUTOS AFETADOS
        try {
            await recalcularPrecosProdutos(prisma);
        } catch (e) {
            console.error('Erro ao recalcular produtos após DELETE insumo:', e);
        }

        res.json({ message: 'Insumo apagado com sucesso' });
    } catch (e) {
        console.error('Erro DELETE Insumos:', e);
        res.status(500).json({ error: 'Erro ao apagar insumo.' });
    }
});

const mapProdutoParaFrontend = (p) => {
    let insumosMapeados = [];
    let custoTotalCalculado = 0;

    if (p.custos && p.custos.length > 0) {
        insumosMapeados = p.custos.map(c => {
            const insumoAtual = c.insumo;
            const precoProp = insumoAtual 
                ? calculatePropCost(insumoAtual.Custo_insumo, insumoAtual.unidade, c.Qtd_Utilizada, c.Unidade)
                : 0;
            
            custoTotalCalculado += precoProp;

            return {
                id: c.Cod_Insumo,
                nome: insumoAtual ? insumoAtual.Nome_Insumo : (c.Nome_Insumo || ''),
                custoUnitario: insumoAtual ? Number(insumoAtual.Custo_insumo) : Number(c.Custo_unitario || 0),
                unidade: c.Unidade || (insumoAtual ? insumoAtual.unidade : ''),
                qtde: Number(c.Qtd_Utilizada || 0),
                valorProporcional: precoProp
            };
        });
    }

    const custoExibir = custoTotalCalculado > 0 ? custoTotalCalculado : Number(p.Custo_Produto || 0);

    const vNum = p.Preco_Venda ? Number(p.Preco_Venda) : 0;
    const cPct = p.Comissao_Porcentagem ? Number(p.Comissao_Porcentagem) : 0;

    console.log(`[MAP] Produto: ${p.Nome_Produto} | ID: ${p.Cod_Produto} | Venda DB: ${p.Preco_Venda} -> Num: ${vNum}`);

    return {
        id: p.Cod_Produto,
        nome: p.Nome_Produto || '',
        qtd: Number(p.Quantidade_Cadastrada || 0),
        custo: `R$ ${custoExibir.toFixed(2).replace('.', ',')}`,
        custoNum: custoExibir,
        venda: `R$ ${vNum.toFixed(2).replace('.', ',')}`,
        vendaNum: vNum,
        comissaoPorcentagem: cPct,
        insumos: insumosMapeados,
        dataCad: p.Dt_Cadastro ? new Date(p.Dt_Cadastro).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
    };
};

app.get('/api/produtos', authenticateToken, async (req, res) => {
    try {
        const produtos = await prisma.produto.findMany({
            include: { 
                custos: {
                    include: { insumo: true }
                }
            },
            orderBy: { Cod_Produto: 'desc' }
        });
        res.json(produtos.map(mapProdutoParaFrontend));
    } catch (e) {
        console.error('Erro GET Produtos:', e);
        res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
});

app.post('/api/produtos', authenticateToken, async (req, res) => {
    const { nome, qtde, custoProduto, precoVenda, comissaoPorcentagem, insumos } = req.body;
    
    // Conversores seguros para POST
    const qty = parseFloat(String(qtde).replace(',', '.')) || 0;
    const cost = parseFloat(String(custoProduto).replace(',', '.')) || 0;
    const sale = parseFloat(String(precoVenda).replace(',', '.')) || 0;
    const comm = parseFloat(String(comissaoPorcentagem).replace(',', '.')) || 0;

    console.log(`[POST /api/produtos] Criando: ${nome}, Venda: ${sale}, Comissao: ${comm}%`);

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const criado = await tx.produto.create({
                data: {
                    Nome_Produto: nome || 'Produto sem Nome',
                    Quantidade_Cadastrada: qty,
                    Custo_Produto: cost,
                    Preco_Venda: sale,
                    Comissao_Porcentagem: comm,
                    custos: {
                        create: (insumos || []).map(i => {
                            const unitCost = parseFloat(i.custoUnitario) || 0;
                            const unitQty = parseFloat(i.qtde) || 0;
                            const precoPropRes = calculatePropCost(unitCost, i.unidadeOriginal || i.originalUnit || i.unidade, unitQty, i.unidade);
                            return {
                                Cod_Insumo: parseInt(i.id),
                                Qtd_Utilizada: unitQty,
                                Unidade: i.unidade || 'unid',
                                Custo_unitario: unitCost,
                                Custo_Proporcional: precoPropRes || 0
                            };
                        })
                    }
                },
                include: { 
                    custos: { include: { insumo: true } }
                }
            });

            if (qty > 0) {
                await tx.entradaProdutos.create({
                    data: {
                        Cod_Produto: criado.Cod_Produto,
                        Nome_Produto: nome || 'Produto sem Nome',
                        Quantidade: qty,
                        Valor_Unitario: cost,
                        Desconto: 0,
                        Total: qty * cost,
                        DtEntrada: new Date()
                    }
                });

                // Abate estoque dos insumos
                for (const item of (insumos || [])) {
                    const insumoDB = await tx.insumo.findUnique({
                        where: { Cod_Insumo: parseInt(item.id) }
                    });
                    if (insumoDB) {
                        const fatorUsado = getFactor(item.unidade);
                        const fatorBase = getFactor(insumoDB.unidade);
                        const totalConsumidoEmBase = (parseFloat(item.qtde) * qty) * fatorUsado;
                        const deducaoNaUnidadeDoBanco = totalConsumidoEmBase / fatorBase;

                        await tx.insumo.update({
                            where: { Cod_Insumo: insumoDB.Cod_Insumo },
                            data: { Estoque: { decrement: deducaoNaUnidadeDoBanco } }
                        });
                    }
                }
            }

            return criado;
        });

        res.json(mapProdutoParaFrontend(resultado));
    } catch (e) {
        console.error('--- ERRO CRÍTICO POST PRODUTOS ---');
        console.error('Payload:', req.body);
        console.error('Erro:', e);
        res.status(500).json({ 
            error: 'Erro interno ao salvar produto.', 
            details: e.message,
            code: e.code 
        });
    }
});

app.put('/api/produtos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log(`[PUT /api/produtos/${id}] BODY RECEBIDO:`, JSON.stringify(req.body));
    
    const { nome, qtde: novaQtde, custoProduto, precoVenda, comissaoPorcentagem, insumos } = req.body;

    const saleNum = parseFloat(String(precoVenda).replace(',', '.')) || 0;
    const commNum = parseFloat(String(comissaoPorcentagem).replace(',', '.')) || 0;
    const costNum = parseFloat(String(custoProduto).replace(',', '.')) || 0;
    const qtyNum = parseFloat(String(novaQtde).replace(',', '.')) || 0;

    console.log(`[PUT /api/produtos/${id}] PARSED -> Venda: ${saleNum}, Comissao: ${commNum}%, Custo: ${costNum}`);
    
    try {
        if (!id || id === 'undefined') {
            throw new Error("ID do produto inválido ou não fornecido.");
        }

        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Pegamos o produto e sua receita ATUAL (antes de mudar)
            const produtoAnterior = await tx.produto.findUnique({
                where: { Cod_Produto: Number(id) },
                include: { custos: true }
            });

            if (!produtoAnterior) {
                throw new Error(`Produto com ID ${id} não encontrado.`);
            }

            const qtdAnterior = Number(produtoAnterior.Quantidade_Cadastrada || 0);
            
            // 2. Mapeamos o consumo anterior por insumo (Total consumido = Qtd_Utilizada * Qtd_Produto)
            const consumoAnteriorMap = {};
            produtoAnterior.custos.forEach(c => {
                const fatorBase = getFactor(c.Unidade);
                consumoAnteriorMap[c.Cod_Insumo] = (Number(c.Qtd_Utilizada) * qtdAnterior) * fatorBase;
            });

            // 3. Primeiro deletamos a receita antiga de forma explícita
            // (Isso evita conflitos de chave primária composta [Cod_Produto, Cod_Insumo])
            await tx.custoProduto.deleteMany({
                where: { Cod_Produto: Number(id) }
            });

            // 4. Atualiza o produto e cria a NOVA receita
            const atualizado = await tx.produto.update({
                where: { Cod_Produto: Number(id) },
                data: {
                    Nome_Produto: nome,
                    Quantidade_Cadastrada: qtyNum,
                    Custo_Produto: costNum,
                    Preco_Venda: saleNum,
                    Comissao_Porcentagem: commNum,
                    custos: {
                        create: (insumos || []).map(i => {
                            const precoPropRes = calculatePropCost(i.custoUnitario, i.unidadeOriginal || i.originalUnit || i.unidade, i.qtde, i.unidade);
                            return {
                                Cod_Insumo: Number(i.id),
                                Qtd_Utilizada: Number(i.qtde),
                                Unidade: i.unidade || '',
                                Custo_unitario: Number(i.custoUnitario) || 0,
                                Custo_Proporcional: precoPropRes
                            };
                        })
                    }
                },
                include: { 
                    custos: { include: { insumo: true } }
                }
            });

            console.log(`[PUT /api/produtos/${id}] DB_RESULT -> Venda: ${atualizado.Preco_Venda}, Comissao: ${atualizado.Comissao_Porcentagem}`);

            // 5. RECONCILIAÇÃO DE ESTOQUE
            for (const itemNovo of (insumos || [])) {
                const insumoDB = await tx.insumo.findUnique({
                    where: { Cod_Insumo: Number(itemNovo.id) }
                });

                if (insumoDB) {
                    const fatorNovo = getFactor(itemNovo.unidade);
                    const fatorNoBanco = getFactor(insumoDB.unidade);
                    
                    const consumoNovoTotalEmBase = (Number(itemNovo.qtde) * Number(novaQtde)) * fatorNovo;
                    const consumoAntigoTotalEmBase = consumoAnteriorMap[Number(itemNovo.id)] || 0;

                    const diferencaParaAbaterEmBase = consumoNovoTotalEmBase - consumoAntigoTotalEmBase;
                    const ajusteNaUnidadeDoBanco = diferencaParaAbaterEmBase / fatorNoBanco;

                    if (Math.abs(ajusteNaUnidadeDoBanco) > 0.00001) { // Evita micro-ajustes de float
                        console.log(`[PUT /api/produtos] Reconciliando Insumo ${insumoDB.Nome_Insumo}: ${-ajusteNaUnidadeDoBanco} ${insumoDB.unidade}`);
                        await tx.insumo.update({
                            where: { Cod_Insumo: Number(itemNovo.id) },
                            data: { Estoque: { decrement: ajusteNaUnidadeDoBanco } }
                        });
                    }
                    delete consumoAnteriorMap[Number(itemNovo.id)];
                }
            }

            // 6. Devolução de insumos removidos
            for (const [codInsumo, consumoAntigoBase] of Object.entries(consumoAnteriorMap)) {
                if (consumoAntigoBase > 0.00001) {
                    const insumoDB = await tx.insumo.findUnique({ where: { Cod_Insumo: Number(codInsumo) } });
                    if (insumoDB) {
                        const fatorNoBanco = getFactor(insumoDB.unidade);
                        const devolucao = consumoAntigoBase / fatorNoBanco;
                        console.log(`[PUT /api/produtos] Devolvendo Insumo removido (ID ${codInsumo}): +${devolucao} ${insumoDB.unidade}`);
                        await tx.insumo.update({
                            where: { Cod_Insumo: Number(codInsumo) },
                            data: { Estoque: { increment: devolucao } }
                        });
                    }
                }
            }

            return atualizado;
        }, {
            timeout: 15000 // Aumenta o timeout para transações mais complexas
        });

        res.json(mapProdutoParaFrontend(resultado));
    } catch (e) {
        console.error('Erro PUT Produtos:', e);
        res.status(500).json({ 
            error: 'Erro ao atualizar produto.', 
            details: e.message,
            stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
        });
    }
});

// --- Deletar Produto ---
app.delete('/api/produtos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] Solicitando exclusão do Produto ID: ${id}`);
    try {
        await prisma.produto.delete({
            where: { Cod_Produto: Number(id) }
        });
        console.log(`[DELETE] Produto ID ${id} excluído com sucesso.`);
        res.json({ message: 'Produto removido com sucesso (incluindo histórico).' });
    } catch (e) {
        console.error('ERRO DETALHADO DELETE Produto:', e);
        res.status(500).json({ error: 'Erro ao remover produto.', details: e.message });
    }
});

// --- Entradas Endpoints ---

// Helper to map DB entries to frontend format
const mapEntradaProdutoParaFrontend = (e) => ({
    id: `P-${e.Cod_Entrada_Prod}`,
    dbId: e.Cod_Entrada_Prod,
    type: 'produto',
    razao: e.Nome_Produto || '',
    fornecedor: 'Produção Própria',
    valor: Number(e.Valor_Unitario || 0).toFixed(2).replace('.', ','),
    qtde: Number(e.Quantidade || 0),
    desconto: Number(e.Desconto || 0).toFixed(2).replace('.', ','),
    total: Number(e.Total || 0).toFixed(2).replace('.', ','),
    emissao: e.DtEmissao.toLocaleDateString('pt-BR'),
    entrada: e.DtEntrada.toLocaleDateString('pt-BR'),
    cadastro: e.DtCadastro.toLocaleDateString('pt-BR'),
    status: 'concluida'
});

const mapEntradaInsumoParaFrontend = (e) => ({
    id: `I-${e.Cod_Entrada_Insumo}`,
    dbId: e.Cod_Entrada_Insumo,
    type: 'insumo',
    razao: e.Nome_Insumo || '',
    fornecedor: e.Nome_Fornecedor || '',
    valor: Number(e.Valor_Unitario || 0).toFixed(2).replace('.', ','),
    qtde: Number(e.Quantidade || 0),
    desconto: Number(e.Desconto || 0).toFixed(2).replace('.', ','),
    total: Number(e.Total || 0).toFixed(2).replace('.', ','),
    emissao: e.DtEmissao.toLocaleDateString('pt-BR'),
    entrada: e.DtEntrada.toLocaleDateString('pt-BR'),
    cadastro: e.DtCadastro.toLocaleDateString('pt-BR'),
    status: 'concluida'
});

app.get('/api/entradas', authenticateToken, async (req, res) => {
    try {
        const [entradasProd, entradasIns] = await Promise.all([
            prisma.entradaProdutos.findMany({ orderBy: { DtCadastro: 'desc' } }),
            prisma.entradaInsumos.findMany({ orderBy: { DtCadastro: 'desc' } })
        ]);

        const formatadas = [
            ...entradasProd.map(mapEntradaProdutoParaFrontend),
            ...entradasIns.map(mapEntradaInsumoParaFrontend)
        ].sort((a, b) => {
            // Sort by ID or Date if possible. Since we want most recent first:
            return b.dbId - a.dbId; 
        });

        res.json(formatadas);
    } catch (e) {
        console.error('Erro GET Entradas:', e);
        res.status(500).json({ error: 'Erro ao buscar entradas.' });
    }
});

// Registrar Produção de Produto (Entrada de Produto Finalizado)
app.post('/api/entradas/produtos', authenticateToken, async (req, res) => {
    const { produtoId, qtde, desconto } = req.body;
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const produto = await tx.produto.findUnique({
                where: { Cod_Produto: Number(produtoId) },
                include: { custos: { include: { insumo: true } } }
            });

            if (!produto) throw new Error("Produto não encontrado.");

            const qtdeNum = Number(qtde);
            const descontoNum = Number(desconto || 0);
            const valorUnitario = Number(produto.Custo_Produto || 0);
            const subtotal = valorUnitario * qtdeNum;
            const total = Math.max(0, subtotal - descontoNum);

            // 1. Validar e Baixar Insumos do estoque
            for (const custo of produto.custos) {
                const totalConsumidoBase = Number(custo.Qtd_Utilizada || 0) * qtdeNum;
                if (totalConsumidoBase > 0) {
                    const insumo = await tx.insumo.findUnique({ where: { Cod_Insumo: custo.Cod_Insumo } });
                    if (!insumo) throw new Error(`Insumo ${custo.Cod_Insumo} não encontrado.`);
                    
                    const fatorNoBanco = getFactor(insumo.unidade);
                    const fatorNaReceita = getFactor(custo.Unidade);
                    
                    // Converte o consumo da unidade da receita para a unidade do estoque
                    const consumoNaUnidadeDoBanco = (totalConsumidoBase * fatorNaReceita) / fatorNoBanco;

                    if (Number(insumo.Estoque || 0) < consumoNaUnidadeDoBanco) {
                        throw new Error(`Estoque insuficiente de ${insumo.Nome_Insumo}. Necessário: ${consumoNaUnidadeDoBanco}, Disponível: ${insumo.Estoque}`);
                    }

                    await tx.insumo.update({
                        where: { Cod_Insumo: custo.Cod_Insumo },
                        data: { Estoque: { decrement: consumoNaUnidadeDoBanco } }
                    });
                }
            }

            // 2. Aumentar estoque do Produto
            await tx.produto.update({
                where: { Cod_Produto: Number(produtoId) },
                data: { Quantidade_Cadastrada: { increment: qtdeNum } }
            });

            // 3. Criar registro de Entrada
            const entrada = await tx.entradaProdutos.create({
                data: {
                    Cod_Produto: Number(produtoId),
                    Nome_Produto: produto.Nome_Produto,
                    Quantidade: qtdeNum,
                    Valor_Unitario: valorUnitario,
                    Desconto: descontoNum,
                    Total: total
                }
            });

            return entrada;
        });

        res.json(mapEntradaProdutoParaFrontend(resultado));
    } catch (e) {
        console.error('Erro POST Entradas Produtos:', e);
        res.status(500).json({ error: e.message || 'Erro ao registrar produção.' });
    }
});

// Registrar Compra de Insumos (Entrada de Matéria-Prima)
app.post('/api/entradas/insumos', authenticateToken, async (req, res) => {
    const { fornecedor, insumos, descontoTotal } = req.body;
    console.log('Recebido POST /api/entradas/insumos:', { fornecedor, count: insumos?.length });
    
    try {
        const resultados = await prisma.$transaction(async (tx) => {
            const listResultados = [];
            
            // Calcula total bruto com segurança
            const totalBruto = (insumos || []).reduce((acc, i) => {
                const v = Number(i.qtde || 0) * Number(i.custoUnitario || 0);
                return acc + (Number.isNaN(v) || !Number.isFinite(v) ? 0 : v);
            }, 0);
            
            const descTotalNum = Number(descontoTotal || 0);
            const ratioDesconto = (totalBruto > 0 && !Number.isNaN(descTotalNum) && Number.isFinite(descTotalNum)) ? (descTotalNum / totalBruto) : 0;

            for (const item of (insumos || [])) {
                let insumoDB;
                const itemId = String(item.id || '');
                
                if (itemId && !itemId.startsWith('ext-') && !itemId.startsWith('17')) { // 17 is usually from Date.now() in JS
                    const idNum = parseInt(itemId);
                    if (!Number.isNaN(idNum)) {
                        insumoDB = await tx.insumo.findUnique({ where: { Cod_Insumo: idNum } });
                    }
                }
                
                if (!insumoDB) {
                    insumoDB = await tx.insumo.findFirst({ 
                        where: { Nome_Insumo: { equals: item.nome, mode: 'insensitive' } } 
                    });
                }

                const qtyNum = Number(item.qtde || 0);
                const unitPriceNum = Number(item.custoUnitario || 0);
                const valorBrutoItem = qtyNum * unitPriceNum;
                const descItem = (Number.isNaN(valorBrutoItem * ratioDesconto) || !Number.isFinite(valorBrutoItem * ratioDesconto)) ? 0 : (valorBrutoItem * ratioDesconto);
                const totalItem = Math.max(0, valorBrutoItem - descItem);

                if (!insumoDB) {
                    const fornDB = await tx.fornecedores.findFirst({
                        where: { Nome_Fornecedor: { equals: fornecedor, mode: 'insensitive' } }
                    });
                    
                    insumoDB = await tx.insumo.create({
                        data: {
                            Nome_Insumo: item.nome,
                            unidade: item.unidade || 'unid',
                            Custo_insumo: unitPriceNum,
                            Estoque: qtyNum,
                            Cod_Fornecedor: fornDB ? fornDB.Cod_Fornecedor : null
                        }
                    });
                } else {
                    await tx.insumo.update({
                        where: { Cod_Insumo: insumoDB.Cod_Insumo },
                        data: {
                            Estoque: { increment: qtyNum },
                            Custo_insumo: item.acaoPreco === 'atualizar' ? unitPriceNum : insumoDB.Custo_insumo
                        }
                    });
                }

                const entrada = await tx.entradaInsumos.create({
                    data: {
                        Cod_Insumo: insumoDB.Cod_Insumo,
                        Nome_Insumo: item.nome,
                        Nome_Fornecedor: fornecedor,
                        Quantidade: qtyNum,
                        Valor_Unitario: unitPriceNum,
                        Desconto: descItem,
                        Total: totalItem
                    }
                });
                listResultados.push(mapEntradaInsumoParaFrontend(entrada));
            }
            return listResultados;
        }, {
            timeout: 15000
        });

        res.json(resultados);
    } catch (e) {
        console.error('ERRO DETALHADO POST Entradas Insumos:', e);
        const errorInfo = {
            message: e.message,
            stack: e.stack,
            code: e.code,
            meta: e.meta,
            body: req.body,
            timestamp: new Date().toISOString()
        };
        try {
            require('fs').writeFileSync('error_debug.json', JSON.stringify(errorInfo, null, 2));
        } catch (fsErr) {
            console.error('Falha ao escrever log de erro:', fsErr);
        }
        res.status(500).json({ 
            error: 'Erro ao registrar entrada de insumos.',
            details: e.message,
            code: e.code
        });
    }
});
// Apagar Entrada de Produto (Reverte produção)
app.delete('/api/entradas/produtos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const entrada = await tx.entradaProdutos.findUnique({
                where: { Cod_Entrada_Prod: Number(id) }
            });

            if (!entrada) throw new Error("Registro de entrada não encontrado.");

            // 1. Reverter estoque do Produto
            await tx.produto.update({
                where: { Cod_Produto: entrada.Cod_Produto },
                data: { Quantidade_Cadastrada: { decrement: Number(entrada.Quantidade) } }
            });

            // 2. Reverter estoque dos Insumos (opcional, dependendo da regra de negócio, mas geralmente produtor quer o insumo de volta se cancela a produção)
            const produto = await tx.produto.findUnique({
                where: { Cod_Produto: entrada.Cod_Produto },
                include: { custos: true }
            });

            if (produto) {
                for (const custo of produto.custos) {
                    const totalConsumidoBase = Number(custo.Qtd_Utilizada || 0) * Number(entrada.Quantidade);
                    const insumo = await tx.insumo.findUnique({ where: { Cod_Insumo: custo.Cod_Insumo } });
                    if (insumo) {
                        const fatorNoBanco = getFactor(insumo.unidade);
                        const fatorNaReceita = getFactor(custo.Unidade);
                        const devolucao = (totalConsumidoBase * fatorNaReceita) / fatorNoBanco;
                        
                        await tx.insumo.update({
                            where: { Cod_Insumo: custo.Cod_Insumo },
                            data: { Estoque: { increment: devolucao } }
                        });
                    }
                }
            }

            // 3. Deletar apenas o registro da entrada
            await tx.entradaProdutos.delete({ where: { Cod_Entrada_Prod: Number(id) } });
        });
        res.json({ message: 'Entrada de produto cancelada e estoque revertido.' });
    } catch (e) {
        console.error('Erro DELETE Entrada Produto:', e);
        res.status(500).json({ error: e.message });
    }
});

// Apagar Entrada de Insumos (Reverte compra)
app.delete('/api/entradas/insumos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const entrada = await tx.entradaInsumos.findUnique({
                where: { Cod_Entrada_Insumo: Number(id) }
            });

            if (!entrada) throw new Error("Registro de compra não encontrado.");

            // 1. Reverter estoque do Insumo
            await tx.insumo.update({
                where: { Cod_Insumo: entrada.Cod_Insumo },
                data: { Estoque: { decrement: Number(entrada.Quantidade) } }
            });

            // 2. Deletar apenas o registro da entrada
            await tx.entradaInsumos.delete({ where: { Cod_Entrada_Insumo: Number(id) } });
        });
        res.json({ message: 'Compra cancelada e estoque ajustado.' });
    } catch (e) {
        console.error('Erro DELETE Entrada Insumo:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- Saídas Endpoints ---
app.get('/api/saidas/produtos', authenticateToken, async (req, res) => {
    try {
        const saidas = await prisma.saidaProdutos.findMany({
            include: { produto: true },
            orderBy: { Cod_Saida_Prod: 'desc' }
        });
        res.json(saidas.map(mapSaidaProdutoParaFrontend));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao listar saídas de produtos.' });
    }
});

app.post('/api/saidas/produtos', authenticateToken, async (req, res) => {
    const { produtoId, cliente, quantidade, valorUnitario, desconto, total, status } = req.body;
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const prod = await tx.produto.findUnique({ where: { Cod_Produto: Number(produtoId) } });
            if (!prod) throw new Error("Produto não encontrado.");
            
            // 1. Criar Saída
            const saida = await tx.saidaProdutos.create({
                data: {
                    Cod_Produto: Number(produtoId),
                    Nome_Produto: prod.Nome_Produto,
                    Nome_Cliente: cliente,
                    Quantidade: Number(quantidade),
                    Valor_Unitario: Number(valorUnitario),
                    Desconto: Number(desconto),
                    Total: Number(total),
                    Status: status || 'pendente',
                    DtSaida: new Date()
                }
            });

            // 2. Diminuir Estoque do Produto
            await tx.produto.update({
                where: { Cod_Produto: Number(produtoId) },
                data: { Quantidade_Cadastrada: { decrement: Number(quantidade) } }
            });

            return saida;
        });
        res.json(mapSaidaProdutoParaFrontend(resultado));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/saidas/produtos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const saida = await tx.saidaProdutos.findUnique({ where: { Cod_Saida_Prod: Number(id) } });
            if (!saida) throw new Error("Saída não encontrada.");

            // 1. Reverter Estoque
            await tx.produto.update({
                where: { Cod_Produto: saida.Cod_Produto },
                data: { Quantidade_Cadastrada: { increment: Number(saida.Quantidade) } }
            });

            // 2. Deletar Registro
            await tx.saidaProdutos.delete({ where: { Cod_Saida_Prod: Number(id) } });
        });
        res.json({ message: 'Saída excluída e estoque revertido.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/saidas/produtos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { produtoId, cliente, quantidade, valorUnitario, desconto, total, status } = req.body;
    const cleanId = String(id).replace('P-', '');
    
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const saidaAntiga = await tx.saidaProdutos.findUnique({ where: { Cod_Saida_Prod: Number(cleanId) } });
            if (!saidaAntiga) throw new Error("Saída não encontrada.");

            // 1. Reverter estoque antigo
            await tx.produto.update({
                where: { Cod_Produto: saidaAntiga.Cod_Produto },
                data: { Quantidade_Cadastrada: { increment: Number(saidaAntiga.Quantidade) } }
            });

            // 2. Verificar novo produto (pode ter mudado o produto na edição)
            const prod = await tx.produto.findUnique({ where: { Cod_Produto: Number(produtoId) } });
            if (!prod) throw new Error("Novo produto selecionado não encontrado.");

            // 3. Atualizar estoque com nova quantidade
            await tx.produto.update({
                where: { Cod_Produto: Number(produtoId) },
                data: { Quantidade_Cadastrada: { decrement: Number(quantidade) } }
            });

            // 4. Atualizar registro da Saída
            const saidaAtualizada = await tx.saidaProdutos.update({
                where: { Cod_Saida_Prod: Number(cleanId) },
                data: {
                    Cod_Produto: Number(produtoId),
                    Nome_Produto: prod.Nome_Produto,
                    Nome_Cliente: cliente,
                    Quantidade: Number(quantidade),
                    Valor_Unitario: Number(valorUnitario),
                    Desconto: Number(desconto),
                    Total: Number(total),
                    Status: status || 'pendente'
                }
            });

            return saidaAtualizada;
        });
        res.json(mapSaidaProdutoParaFrontend(resultado));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/saidas/insumos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { insumoId, quantidade, status } = req.body;
    
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const saidaAntiga = await tx.saidaInsumos.findUnique({ where: { Cod_Saida_Insumo: Number(id) } });
            if (!saidaAntiga) throw new Error("Registro de saída não encontrado.");

            // 1. Reverter estoque antigo
            await tx.insumo.update({
                where: { Cod_Insumo: saidaAntiga.Cod_Insumo },
                data: { Estoque: { increment: Number(saidaAntiga.Quantidade) } }
            });

            // 2. Verificar novo insumo
            const insumo = await tx.insumo.findUnique({ where: { Cod_Insumo: Number(insumoId) } });
            if (!insumo) throw new Error("Insumo não encontrado.");

            // 3. Aplicar nova quantidade
            await tx.insumo.update({
                where: { Cod_Insumo: Number(insumoId) },
                data: { Estoque: { decrement: Number(quantidade) } }
            });

            // 4. Atualizar registro
            const saidaAtualizada = await tx.saidaInsumos.update({
                where: { Cod_Saida_Insumo: Number(id) },
                data: {
                    Cod_Insumo: Number(insumoId),
                    Nome_Insumo: insumo.Nome_Insumo,
                    Quantidade: Number(quantidade),
                    Status: status || 'saída'
                }
            });

            return saidaAtualizada;
        });
        res.json(mapSaidaInsumoParaFrontend(resultado));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/saidas/insumos', authenticateToken, async (req, res) => {
    try {
        const saidas = await prisma.saidaInsumos.findMany({
            include: { insumo: true },
            orderBy: { Cod_Saida_Insumo: 'desc' }
        });
        res.json(saidas.map(mapSaidaInsumoParaFrontend));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao listar saídas de insumos.' });
    }
});

app.post('/api/saidas/insumos', authenticateToken, async (req, res) => {
    const { insumoId, quantidade, status } = req.body;
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const insumo = await tx.insumo.findUnique({ where: { Cod_Insumo: Number(insumoId) } });
            if (!insumo) throw new Error("Insumo não encontrado.");

            // 1. Criar Saída
            const saida = await tx.saidaInsumos.create({
                data: {
                    Cod_Insumo: Number(insumoId),
                    Nome_Insumo: insumo.Nome_Insumo,
                    Quantidade: Number(quantidade),
                    Status: status || 'saída',
                    DtSaida: new Date()
                }
            });

            // 2. Diminuir Estoque do Insumo
            await tx.insumo.update({
                where: { Cod_Insumo: Number(insumoId) },
                data: { Estoque: { decrement: Number(quantidade) } }
            });

            return saida;
        });
        res.json(mapSaidaInsumoParaFrontend(resultado));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/saidas/insumos/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const saida = await tx.saidaInsumos.findUnique({ where: { Cod_Saida_Insumo: Number(id) } });
            if (!saida) throw new Error("Saída de insumo não encontrada.");

            // 1. Reverter Estoque
            await tx.insumo.update({
                where: { Cod_Insumo: saida.Cod_Insumo },
                data: { Estoque: { increment: Number(saida.Quantidade) } }
            });

            // 2. Deletar Registro
            await tx.saidaInsumos.delete({ where: { Cod_Saida_Insumo: Number(id) } });
        });
        res.json({ message: 'Saída de insumo excluída e estoque revertido.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
    // Se for uma rota de API que não foi encontrada, retorna 404 normal
    if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: `Route ${req.url} not found` });
    }
    // Caso contrário, serve o index.html (para suporte a SPA routing)
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[${new Date().toLocaleTimeString()}] >>> SERVER LIVE ON PORT ${PORT} (0.0.0.0) <<<`);
    try {
        await recalcularPrecosProdutos(prisma);
    } catch (e) {
        console.error('Erro no recálculo inicial:', e);
    }
    // Keep alive interval to prevent accidental exit
    setInterval(() => {
        // No-op
    }, 60000);
});

process.on('exit', (code) => {
    console.log(`Server process exiting with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down...');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
