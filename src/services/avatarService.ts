import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

// Bucket público "avatars" no Supabase Storage; cada usuário só escreve na
// própria pasta (<id>/avatar.jpg). Criação e políticas: docs/SUPABASE.md.
const BUCKET = 'avatars';
const SIZE = 512;

export type AvatarSource = 'camera' | 'library';

export class PermissionDeniedError extends Error {}

const pathFor = (userId: string) => `${userId}/avatar.jpg`;

/**
 * Abre a câmera ou a galeria já com recorte quadrado e devolve uma cópia
 * reduzida para 512 px (uma foto de celular tem vários MB; o avatar, ~50 KB).
 * null = a pessoa cancelou.
 */
export async function pickAvatar(source: AvatarSource): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  };

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new PermissionDeniedError('camera');
    result = await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.front });
  } else {
    // A galeria do sistema (PHPicker no iOS) não exige permissão de fotos.
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return null;

  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: SIZE, height: SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Envia a foto e grava o endereço dela na conta. Devolve a URL pública. */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const body = await (await fetch(localUri)).arrayBuffer();
  const path = pathFor(userId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // O arquivo tem sempre o mesmo nome: o ?v= força o app a baixar a foto nova
  // em vez de mostrar a antiga do cache.
  const url = `${data.publicUrl}?v=${Date.now()}`;
  // photo_url, não avatar_url: o login do Google regrava avatar_url (AuthContext).
  const { error: updateError } = await supabase.auth.updateUser({ data: { photo_url: url } });
  if (updateError) throw updateError;
  return url;
}

export async function removeAvatar(userId: string, clearProfile = true): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([pathFor(userId)]);
  if (error) throw error;
  if (clearProfile) {
    const { error: updateError } = await supabase.auth.updateUser({ data: { photo_url: null } });
    if (updateError) throw updateError;
  }
}
