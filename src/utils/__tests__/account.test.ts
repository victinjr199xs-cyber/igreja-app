import { isStrongPassword, nameFromMetadata, photoFromMetadata } from '../account';

describe('isStrongPassword', () => {
  it('exige 8 caracteres, letra e número', () => {
    expect(isStrongPassword('igreja2026')).toBe(true);
    expect(isStrongPassword('Adoração1')).toBe(true);
    expect(isStrongPassword('abc123')).toBe(false); // curta
    expect(isStrongPassword('somenteletras')).toBe(false);
    expect(isStrongPassword('1234567890')).toBe(false);
  });

  it('aceita letra acentuada como letra', () => {
    expect(isStrongPassword('çãéíõú12')).toBe(true);
    expect(isStrongPassword('!!!!!!!1')).toBe(false); // só símbolo e número
  });
});

describe('nameFromMetadata', () => {
  it('prefere display_name (contas novas) a name (contas antigas)', () => {
    expect(nameFromMetadata({ display_name: 'Victor', name: 'Victor P.' })).toBe('Victor');
  });
  it('lê contas antigas (name)', () => {
    expect(nameFromMetadata({ name: 'Maria' })).toBe('Maria');
  });
  it('sem nome devolve vazio', () => {
    expect(nameFromMetadata(undefined)).toBe('');
    expect(nameFromMetadata({ name: 42 })).toBe('');
  });
});

describe('photoFromMetadata', () => {
  it('prefere photo_url (contas novas) a avatar_url (contas antigas)', () => {
    expect(photoFromMetadata({ photo_url: 'https://a/novo.jpg', avatar_url: 'https://a/antigo.jpg' })).toBe(
      'https://a/novo.jpg'
    );
  });
  it('foto removida (photo_url nulo) não volta para a antiga', () => {
    expect(photoFromMetadata({ photo_url: null, avatar_url: 'https://a/antigo.jpg' })).toBeNull();
  });
  it('contas antigas usam avatar_url', () => {
    expect(photoFromMetadata({ avatar_url: 'https://a/antigo.jpg' })).toBe('https://a/antigo.jpg');
    expect(photoFromMetadata({})).toBeNull();
  });
});
