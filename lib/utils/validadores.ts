/**
 * Validação de CPF e CNPJ pelo algoritmo de dígitos verificadores.
 * Isso valida o FORMATO do documento — não confirma que ele pertence
 * de fato ao usuário. A confirmação de identidade real deve usar uma
 * API de verificação (Receita Federal / serviço terceirizado) antes de
 * marcar o perfil como "verificado".
 */

export function limparDocumento(doc: string): string {
  return doc.replace(/\D/g, '');
}

export function validarCPF(cpfInput: string): boolean {
  const cpf = limparDocumento(cpfInput);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digitos = cpf.split('').map(Number);
  const calcularDigito = (base: number[]) => {
    let soma = 0;
    let peso = base.length + 1;
    for (const d of base) {
      soma += d * peso;
      peso--;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcularDigito(digitos.slice(0, 9));
  const d2 = calcularDigito(digitos.slice(0, 10));

  return d1 === digitos[9] && d2 === digitos[10];
}

export function validarCNPJ(cnpjInput: string): boolean {
  const cnpj = limparDocumento(cnpjInput);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digitos = cnpj.split('').map(Number);
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcularDigito = (base: number[], pesos: number[]) => {
    const soma = base.reduce((acc, d, i) => acc + d * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = calcularDigito(digitos.slice(0, 12), pesos1);
  const d2 = calcularDigito(digitos.slice(0, 13), pesos2);

  return d1 === digitos[12] && d2 === digitos[13];
}

export function validarDocumento(doc: string): { valido: boolean; tipo: 'cpf' | 'cnpj' | null } {
  const limpo = limparDocumento(doc);
  if (limpo.length === 11) return { valido: validarCPF(limpo), tipo: 'cpf' };
  if (limpo.length === 14) return { valido: validarCNPJ(limpo), tipo: 'cnpj' };
  return { valido: false, tipo: null };
}
