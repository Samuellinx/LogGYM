import type {User} from 'firebase/auth';

import {firebaseAuth} from './firebase';
import {updateUserProfilePhoto} from './auth';

const MAX_PROFILE_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Não foi possível ler a imagem selecionada.'));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });

export const updateProfilePhotoFromFile = async (user: User, file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Use uma imagem JPG, PNG, WEBP ou GIF para a foto de perfil.');
  }

  if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
    throw new Error('A foto excede o limite de 2 MB.');
  }

  const photoDataUrl = await fileToDataUrl(file);
  const updatedUser = await updateUserProfilePhoto(user, photoDataUrl);

  return updatedUser ?? firebaseAuth.currentUser;
};
