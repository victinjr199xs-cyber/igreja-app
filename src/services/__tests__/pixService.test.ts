import { buildPixPayload, crc16 } from '../pixService';

/** Lê os campos EMV (ID de 2 dígitos + tamanho de 2 dígitos + valor). */
function parseEmv(payload: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    fields[id] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return fields;
}

describe('CRC16 do BR Code', () => {
  it('bate com o valor de verificação padrão do CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('bate com o exemplo do manual do Banco Central', () => {
    const semCrc =
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000' +
      '5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304';
    expect(crc16(semCrc)).toBe('1D3D');
  });
});

describe('Pix copia e cola', () => {
  const payload = buildPixPayload({
    key: 'contato@igreja.com.br',
    holder: 'Casa de Adoração',
    city: 'Trindade',
    description: 'Oferta',
  });
  const f = parseEmv(payload);

  it('tem a estrutura EMV exigida', () => {
    expect(f['00']).toBe('01');
    expect(f['52']).toBe('0000');
    expect(f['53']).toBe('986'); // real
    expect(f['58']).toBe('BR');
    expect(f['62']).toBe('0503***');
  });

  it('leva a chave e a descrição no campo 26', () => {
    const account = parseEmv(f['26']);
    expect(account['00']).toBe('br.gov.bcb.pix');
    expect(account['01']).toBe('contato@igreja.com.br');
    expect(account['02']).toBe('Oferta');
  });

  it('não define valor (a pessoa escolhe no banco)', () => {
    expect(f['54']).toBeUndefined();
  });

  it('tira acentos e põe em maiúsculas nome e cidade', () => {
    expect(f['59']).toBe('CASA DE ADORACAO');
    expect(f['60']).toBe('TRINDADE');
  });

  it('corta nome e cidade no tamanho máximo do padrão', () => {
    const long = parseEmv(
      buildPixPayload({ key: 'k', holder: 'Igreja Evangélica Casa de Adoração Reino', city: 'Santo Antônio do Descoberto' })
    );
    expect(long['59'].length).toBeLessThanOrEqual(25);
    expect(long['60'].length).toBeLessThanOrEqual(15);
  });

  it('termina com o CRC do próprio conteúdo', () => {
    expect(payload.slice(-8, -4)).toBe('6304');
    expect(crc16(payload.slice(0, -4))).toBe(payload.slice(-4));
  });
});
