import { nameFromMetadata, parseAuthCallback, photoFromMetadata } from '../account';

describe('nameFromMetadata', () => {
  it('prefere o nome escolhido no app ao do Google', () => {
    expect(nameFromMetadata({ display_name: 'Victor', name: 'Victor P. (Google)' })).toBe('Victor');
  });
  it('lê contas antigas (name) e contas do Google (full_name)', () => {
    expect(nameFromMetadata({ name: 'Maria' })).toBe('Maria');
    expect(nameFromMetadata({ full_name: 'João Silva' })).toBe('João Silva');
  });
  it('sem nome devolve vazio', () => {
    expect(nameFromMetadata(undefined)).toBe('');
    expect(nameFromMetadata({ name: 42 })).toBe('');
  });
});

describe('photoFromMetadata', () => {
  it('prefere a foto enviada no app à do Google', () => {
    expect(photoFromMetadata({ photo_url: 'https://a/app.jpg', avatar_url: 'https://g/pic' })).toBe(
      'https://a/app.jpg'
    );
  });
  it('foto removida no app não volta para a do Google', () => {
    expect(photoFromMetadata({ photo_url: null, avatar_url: 'https://g/pic' })).toBeNull();
  });
  it('contas antigas e do Google usam avatar_url', () => {
    expect(photoFromMetadata({ avatar_url: 'https://g/pic' })).toBe('https://g/pic');
    expect(photoFromMetadata({})).toBeNull();
  });
});

describe('parseAuthCallback', () => {
  it('lê o código no app instalado e no Expo Go', () => {
    expect(parseAuthCallback('casadeadoracao://auth-callback?code=abc123')).toEqual({ code: 'abc123' });
    expect(parseAuthCallback('exp://192.168.0.5:8081/--/auth-callback?code=xyz')).toEqual({ code: 'xyz' });
  });
  it('lê o erro, inclusive no fragmento', () => {
    expect(
      parseAuthCallback('casadeadoracao://auth-callback#error=access_denied&error_description=Acesso+negado')
    ).toEqual({ error: 'Acesso negado' });
  });
  it('sem parâmetros ou com codificação quebrada não lança', () => {
    expect(parseAuthCallback('casadeadoracao://auth-callback')).toEqual({});
    expect(parseAuthCallback('x://cb?code=%E0%A4%A')).toEqual({ code: '%E0%A4%A' });
  });
});
