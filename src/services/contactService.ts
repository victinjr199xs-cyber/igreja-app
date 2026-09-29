import { Alert, Linking, Platform } from 'react-native';
import { CHURCH_ADDRESS, CHURCH_INFO } from '../data/churchData';

async function open(url: string, fallback?: string) {
  try {
    await Linking.openURL(url);
  } catch {
    if (fallback) {
      await Linking.openURL(fallback).catch(() => {});
    } else {
      Alert.alert('Não foi possível abrir', 'Verifique se o app necessário está instalado.');
    }
  }
}

/** Abre o app de mapas do celular com o endereço da igreja. */
export function openChurchMap() {
  const q = encodeURIComponent(CHURCH_ADDRESS);
  const web = `https://www.google.com/maps/search/?api=1&query=${q}`;
  const native = Platform.OS === 'ios' ? `https://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
  return open(native, web);
}

export function callChurch() {
  return open(`tel:+${CHURCH_INFO.phoneE164}`);
}

/** wa.me funciona com ou sem o WhatsApp instalado (cai no navegador). */
export function whatsappChurch() {
  const text = encodeURIComponent('Olá! Vim pelo app da Casa de Adoração.');
  return open(`https://wa.me/${CHURCH_INFO.phoneE164}?text=${text}`);
}
