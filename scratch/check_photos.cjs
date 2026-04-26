const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({});

async function check() {
  try {
    const insumos = await prisma.insumo.findMany();
    console.log('--- RELATÓRIO DE FOTOS NO BANCO ---');
    insumos.forEach(i => {
      console.log(`ID: ${i.Cod_Insumo} | Nome: ${i.Nome_Insumo} | Foto: ${i.foto ? i.foto.substring(0, 30) + '...' : 'VAZIO'}`);
    });
  } catch (e) {
    console.error('Erro na biópsia:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
