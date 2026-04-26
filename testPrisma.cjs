require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  try {
    const res = await prisma.produto.create({
      data: {
        Nome_Produto: 'TesteNovoProduto',
        Quantidade_Cadastrada: 2,
        Custo_Produto: 10,
        Preco_Venda: 20,
        custos: {
          create: []
        }
      }
    });
    console.log('Sucesso:', res);
  } catch(e) {
    console.error('Erro Prisma:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
