// Identidade da Casa de Adoração (Trindade-GO), tirada da logo e do banner do
// canal: vinho no nome, grafite nos textos, fundo cinza-claro.
//
// As telas não importam uma paleta fixa: pegam a ativa com useTheme(), que
// segue a escolha feita em Configurações (automático, claro ou escuro).
// Todos os valores são #RRGGBB, porque o código concatena opacidade
// (ex.: colors.primary + '20').

export const LIGHT = {
  primary: '#823030',
  primaryLight: '#A34848',
  primaryDark: '#5C1F1F',
  // A marca é monocromática; o destaque é um vinho mais claro.
  secondary: '#A34848',
  secondaryLight: '#C98A8A',
  // Branco literal: texto e ícones sobre o vinho, em qualquer tema.
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8A8583',
  lightGray: '#F2F0EF',
  background: '#EEECEB',
  // Cinza do fundo da logo, usado no cabeçalho.
  surface: '#E3E1DF',
  card: '#FFFFFF',
  text: '#333333',
  textLight: '#6B6664',
  border: '#DDD9D7',
  success: '#4CAF50',
  error: '#C62828',
  // Dourado envelhecido, em harmonia com o vinho.
  gold: '#B08D57',
};

export type Palette = typeof LIGHT;

// No escuro o vinho da logo some contra o fundo: clareado para manter
// contraste, sem perder o tom. Fundos quentes, puxados para o marrom.
export const DARK: Palette = {
  primary: '#C45C5C',
  primaryLight: '#8E3A3A',
  primaryDark: '#5C1F1F',
  secondary: '#D07070',
  secondaryLight: '#7A3A3A',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#8F8886',
  lightGray: '#2A2625',
  background: '#141211',
  surface: '#1D1A19',
  card: '#242120',
  text: '#ECE7E5',
  textLight: '#A8A09D',
  border: '#36312F',
  success: '#66BB6A',
  error: '#EF5350',
  gold: '#C9A66B',
};

// Fira Sans lembra o nome da logo; Fira Mono, a linha "Reino de Sacerdotes".
// Carregadas em App.tsx antes de o app aparecer.
export const FONTS = {
  regular: { fontFamily: 'FiraSans_400Regular' },
  medium: { fontFamily: 'FiraSans_500Medium' },
  bold: { fontFamily: 'FiraSans_700Bold' },
  mono: { fontFamily: 'FiraMono_400Regular' },
};

export const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  xl: 20,
  extraLarge: 24,
  xxl: 32,
  padding: 16,
  radius: 12,
};
