import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { authErrorMessage, useAuth } from '../context/AuthContext';
import { AvatarSource, PermissionDeniedError } from '../services/avatarService';
import { reportError } from '../services/errorReporter';

/**
 * Menu "Tirar foto / Escolher da galeria / Remover foto" e o envio, com
 * estado de carregamento e erros em português.
 */
export function useAvatarPicker(onChanged?: () => void) {
  const { changeAvatar, deleteAvatar, avatarUrl } = useAuth();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<boolean | void>) => {
    setBusy(true);
    try {
      const changed = await fn();
      if (changed !== false) onChanged?.();
    } catch (e) {
      if (!(e instanceof PermissionDeniedError)) reportError('avatar', e);
      Alert.alert('Não foi possível atualizar a foto', authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const pick = (source: AvatarSource) => run(() => changeAvatar(source));
  const remove = () => run(() => deleteAvatar());

  const openMenu = () => {
    const options = ['Tirar foto', 'Escolher da galeria', ...(avatarUrl ? ['Remover foto'] : []), 'Cancelar'];
    const handle = (i: number) => {
      if (i === 0) pick('camera');
      else if (i === 1) pick('library');
      else if (avatarUrl && i === 2) remove();
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Foto de perfil',
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: avatarUrl ? 2 : undefined,
        },
        handle
      );
    } else {
      Alert.alert(
        'Foto de perfil',
        undefined,
        options.map((text, i) => ({
          text,
          style: text === 'Cancelar' ? 'cancel' : text === 'Remover foto' ? 'destructive' : 'default',
          onPress: () => handle(i),
        }))
      );
    }
  };

  return { busy, pick, remove, openMenu };
}
