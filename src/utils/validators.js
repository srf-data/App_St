import { z } from 'zod';

// Helper to format zod error into a simple map { field: message }
export function formatZodError(error) {
  const errors = {};
  error.issues.forEach((issue) => {
    const field = issue.path[issue.path.length - 1];
    errors[field] = issue.message;
  });
  return errors;
}

export const userSchema = z
  .object({
    nome: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(120),
    email: z.string().trim().email('E-mail inválido').max(255),
    confirmEmail: z.string().trim().email('Confirmação de e-mail inválida'),
    senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmSenha: z.string().min(6, 'Confirmação de senha inválida'),
  })
  .refine((data) => data.email === data.confirmEmail, {
    message: 'Os e-mails não coincidem',
    path: ['confirmEmail'],
  })
  .refine((data) => data.senha === data.confirmSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmSenha'],
  });

export const productSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto').max(120),
  qtd: z.coerce
    .number()
    .nonnegative('Quantidade não pode ser negativa'),
});

export const materialSchema = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto').max(120),
  fornecedorId: z.string().min(1, 'Selecione um fornecedor'),
  unidade: z.string().min(1, 'Selecione uma unidade'),
  custo: z.coerce.number().positive('Custo deve ser maior que zero'),
  estoque: z.coerce.number().nonnegative('Estoque não pode ser negativo'),
});

export const entrySchema = z.object({
  qtde: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  valor: z.coerce.number().nonnegative('Valor não pode ser negativo').optional(),
  desconto: z.coerce.number().nonnegative('Desconto não pode ser negativo').optional(),
});

/**
 * Limpa mensagens de erro técnicas do servidor para exibição amigável ao usuário.
 */
export function cleanNotificationMessage(msg) {
  if (!msg) return 'Ocorreu um erro inesperado.';
  if (typeof msg !== 'string') {
    if (msg.message) return cleanNotificationMessage(msg.message);
    return 'Erro desconhecido no servidor.';
  }
  
  let cleaned = msg
    .replace(/^Error: /i, '')
    .replace(/^PrismaClientKnownRequestError: /i, '')
    .replace(/P\d{4}: /g, '')
    .replace(/Foreign key constraint failed on the field: .*/i, 'Este registro possui dependências e não pode ser excluído.')
    .replace(/Unique constraint failed on the fields: .*/i, 'Já existe um registro com estes dados.')
    .replace(/Record to delete does not exist/i, 'Registro não encontrado.')
    .replace(/Record to update not found/i, 'Registro para atualização não encontrado.')
    .replace(/\$/g, 'R$') // Garante que qualquer menção a dólar vire R$
    .trim();

  // Caso a mensagem ainda seja muito técnica ou código bruto
  if (cleaned.length > 250 || cleaned.includes('Prisma') || (cleaned.includes('{') && cleaned.includes('}'))) {
    return 'Falha na operação. Verifique os dados e tente novamente.';
  }

  return cleaned;
}

/**
 * Formata números para o padrão brasileiro (vírgula para decimais).
 */
export function formatBRNumber(val, decimals = 2) {
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('pt-BR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}
