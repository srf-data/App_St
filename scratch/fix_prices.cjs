require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const pkg = require('@prisma/client');
const { PrismaClient } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fixProducts() {
    console.log('Recalculando preços e custos...');
    const produtos = await prisma.produto.findMany({
        include: { custos: true }
    });

    for (const p of produtos) {
        const novoCustoTotal = p.custos.reduce((sum, item) => {
            return sum + Number(item.Custo_Proporcional || 0);
        }, 0);

        // Aplicar markup de 2.2x
        const novoPrecoVenda = novoCustoTotal * 2.2;

        await prisma.produto.update({
            where: { Cod_Produto: p.Cod_Produto },
            data: { 
                Custo_Produto: novoCustoTotal,
                Preco_Venda: novoPrecoVenda
            }
        });
        console.log(`Produto ${p.Nome_Produto} (ID ${p.Cod_Produto}) corrigido: Custo R$ ${novoCustoTotal.toFixed(2)}, Venda R$ ${novoPrecoVenda.toFixed(2)}`);
    }
    console.log('Finalizado.');
    process.exit(0);
}

fixProducts().catch(e => {
    console.error(e);
    process.exit(1);
});
