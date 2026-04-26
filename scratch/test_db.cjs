require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const pkg = require('@prisma/client');
const { PrismaClient } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Tentando criar um insumo de teste...");
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const criado = await tx.insumo.create({
                data: {
                    Nome_Insumo: "Teste " + Date.now(),
                    unidade: "unid",
                    Custo_insumo: 10.5,
                    Estoque: 100
                }
            });
            console.log("Insumo criado com ID:", criado.Cod_Insumo);

            await tx.entradaInsumos.create({
                data: {
                    Cod_Insumo: criado.Cod_Insumo,
                    Nome_Insumo: criado.Nome_Insumo,
                    Quantidade: 100,
                    Valor_Unitario: 10.5,
                    Desconto: 0,
                    Total: 1050,
                    DtEntrada: new Date()
                }
            });
            console.log("Registro de entrada criado.");
            return criado;
        });
        console.log("Sucesso!");
    } catch (e) {
        console.error("ERRO NO TESTE:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
