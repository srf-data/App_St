import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Inserir um Produto teste para o Neon
  const novoProduto = await prisma.produto.create({
    data: {
      Nome_Produto: "Vela Aromática Teste Neon",
      Quantidade_Cadastrada: 10,
      Custo_Produto: 15.50,
      Preco_Venda: 45.00
    }
  })

  console.log("-> Produto Novo Criado no Neon:", novoProduto)

  // Listar todos os produtos para provar que está lá
  const todosOsProdutos = await prisma.produto.findMany()
  console.log("-> Todos os Produtos no Neon:", todosOsProdutos)

  // Listar todos os produtos
  const produtos = await prisma.produto.findMany()
  console.log("Produtos:", produtos)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
