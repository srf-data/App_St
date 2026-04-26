require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const count = await prisma.usuarios.count();
    console.log('COUNT: ' + count);
    if (count === 0) {
        await prisma.usuarios.create({
            data: {
                Nome_Usuario: 'Studio Solart',
                email: 'admin@studiosolart.com',
                senha: 'admin'
            }
        });
        console.log('CREATED_ADMIN');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
