const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const insumos = await prisma.insumo.findMany({
        where: { Nome_Insumo: { contains: 'Essencia', mode: 'insensitive' } }
    });
    console.log('Insumos:', JSON.stringify(insumos, null, 2));

    const produtos = await prisma.produto.findMany({
        where: { Nome_Produto: { contains: 'Vela', mode: 'insensitive' } },
        include: { custos: true }
    });
    console.log('Produtos e Custos:', JSON.stringify(produtos, null, 2));

    await prisma.$disconnect();
}

check();
