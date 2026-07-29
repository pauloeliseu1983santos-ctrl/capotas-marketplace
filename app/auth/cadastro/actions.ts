'use server';

/**
 * Server Action de cadastro. Roda no servidor — nunca expõe a service_role
 * key ao cliente. Valida o formato do documento antes de criar o usuário
 * no Supabase Auth e o perfil correspondente em `profiles`.
 */
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { validarDocumento } from '@/lib/utils/validadores';

const schemaCadastro = z.object({
  nome: z.string().min(3, 'Informe o nome completo ou razão social'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
  documento: z.string().min(11, 'Informe um CPF ou CNPJ válido'),
  whatsapp: z.string().min(10, 'Informe um WhatsApp válido'),
  role: z.enum(['fabricante', 'loja', 'vendedor_particular', 'comprador']),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  cidade: z.string().min(2),
  estado: z.string().length(2),
});

export type EstadoCadastro = {
  sucesso: boolean;
  erro?: string;
  erros_campo?: Record<string, string[]>;
};

export async function cadastrarUsuario(
  _estadoAnterior: EstadoCadastro,
  formData: FormData
): Promise<EstadoCadastro> {
  const dadosBrutos = {
    nome: formData.get('nome'),
    email: formData.get('email'),
    senha: formData.get('senha'),
    documento: formData.get('documento'),
    whatsapp: formData.get('whatsapp'),
    role: formData.get('role'),
    cep: formData.get('cep'),
    cidade: formData.get('cidade'),
    estado: formData.get('estado'),
  };

  const parsed = schemaCadastro.safeParse(dadosBrutos);
  if (!parsed.success) {
    return { sucesso: false, erros_campo: parsed.error.flatten().fieldErrors };
  }

  const { documento, ...dados } = parsed.data;
  const { valido, tipo } = validarDocumento(documento);

  if (!valido || !tipo) {
    return { sucesso: false, erro: 'CPF/CNPJ inválido. Verifique os dígitos informados.' };
  }

  const supabase = createClient();

  // 1. Cria o usuário no Supabase Auth (dispara e-mail de confirmação automaticamente)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirmar`,
    },
  });

  if (authError || !authData.user) {
    return { sucesso: false, erro: authError?.message ?? 'Não foi possível criar a conta.' };
  }

  // 2. Cria o perfil de negócio vinculado
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    role: dados.role,
    nome: dados.nome,
    documento: documento.replace(/\D/g, ''),
    tipo_documento: tipo,
    whatsapp: dados.whatsapp,
    endereco: { cep: dados.cep, cidade: dados.cidade, estado: dados.estado },
  });

  if (profileError) {
    // Documento duplicado é o caso mais comum de conflito aqui (constraint unique)
    if (profileError.code === '23505') {
      return { sucesso: false, erro: 'Este CPF/CNPJ já está cadastrado na plataforma.' };
    }
    return { sucesso: false, erro: 'Erro ao criar perfil. Tente novamente.' };
  }

  return { sucesso: true };
}
