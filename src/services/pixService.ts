/**
 * Pix "copia e cola" estático (BR Code, padrão EMV do Banco Central), sem
 * valor definido: a pessoa digita quanto quer ofertar no app do banco.
 * O mesmo texto vira o QR code.
 */

/** Campo EMV: ID + tamanho com 2 dígitos + valor. */
function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, '0') + value;
}

/** Nome e cidade no BR Code: maiúsculas, sem acentos, com limite de tamanho. */
function clean(text: string, max: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, max)
    .trim();
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no campo 63. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixConfig {
  key: string;
  holder: string;
  city: string;
  description?: string;
}

export function buildPixPayload({ key, holder, city, description }: PixConfig): string {
  const account =
    field('00', 'br.gov.bcb.pix') +
    field('01', key.trim()) +
    (description ? field('02', description.slice(0, 40)) : '');
  const payload =
    field('00', '01') +
    field('26', account) +
    field('52', '0000') +
    field('53', '986') + // real
    field('58', 'BR') +
    field('59', clean(holder, 25)) +
    field('60', clean(city, 15)) +
    field('62', field('05', '***')) + // sem identificador de transação
    '6304';
  return payload + crc16(payload);
}
