import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
} from '@react-native-documents/picker';
import {FileSystem} from 'react-native-file-access';

const PROFILE_PHOTO_TYPES = ['image/*'];
const MAX_PROFILE_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

const decodeFileUriToPath = (uri: string) =>
  decodeURIComponent(uri.replace(/^file:\/\//, ''));

const isUserCancellation = (error: unknown) =>
  isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;

const inferMimeType = (fileName: string, mimeType?: string | null) => {
  const normalizedMime = mimeType?.trim().toLowerCase();

  if (normalizedMime?.startsWith('image/')) {
    return normalizedMime;
  }

  const extension = fileName.split('.').pop()?.trim().toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      throw new Error('Use uma imagem JPG, PNG, WEBP ou GIF para a foto de perfil.');
  }
};

export const pickProfilePhotoDataUrl = async () => {
  let localPath: string | null = null;

  try {
    const [pickedFile] = await pick({
      mode: 'open',
      requestLongTermAccess: false,
      type: PROFILE_PHOTO_TYPES,
      allowMultiSelection: false,
    });

    if (pickedFile.size && pickedFile.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
      throw new Error('A foto excede o limite de 2 MB.');
    }

    const fileName = pickedFile.name?.trim() || 'profile-photo';
    const mimeType = inferMimeType(fileName, pickedFile.type);
    const [localCopy] = await keepLocalCopy({
      destination: 'cachesDirectory',
      files: [
        {
          uri: pickedFile.uri,
          fileName,
        },
      ],
    });

    if (localCopy.status !== 'success') {
      throw new Error('Não foi possível preparar a imagem selecionada.');
    }

    localPath = decodeFileUriToPath(localCopy.localUri);
    const base64 = await FileSystem.readFile(localPath, 'base64');

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    if (isUserCancellation(error)) {
      return null;
    }

    throw error;
  } finally {
    if (localPath && (await FileSystem.exists(localPath))) {
      await FileSystem.unlink(localPath);
    }
  }
};
