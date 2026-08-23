/**
 * Google Drive Mobile Utility for React Native / Expo
 * Uploads files directly to user's Google Drive via Drive API v3
 */

import * as SecureStore from 'expo-secure-store';

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const SECURE_KEY_ACCESS_TOKEN = 'tb_gdrive_access_token';
const SECURE_KEY_USER_EMAIL = 'tb_gdrive_user_email';

export async function saveGoogleDriveSession(accessToken: string, email?: string) {
  try {
    await SecureStore.setItemAsync(SECURE_KEY_ACCESS_TOKEN, accessToken);
    if (email) {
      await SecureStore.setItemAsync(SECURE_KEY_USER_EMAIL, email);
    }
  } catch (e) {
    console.warn('[GoogleDrive] Failed to cache token to SecureStore:', e);
  }
}

export async function getSavedGoogleDriveSession(): Promise<{ accessToken: string | null; email: string | null }> {
  try {
    const accessToken = await SecureStore.getItemAsync(SECURE_KEY_ACCESS_TOKEN);
    const email = await SecureStore.getItemAsync(SECURE_KEY_USER_EMAIL);
    return { accessToken, email };
  } catch (e) {
    return { accessToken: null, email: null };
  }
}

export async function clearGoogleDriveSession() {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEY_ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEY_USER_EMAIL);
  } catch (e) {
    console.warn('[GoogleDrive] Failed to clear token:', e);
  }
}

/**
 * Finds or creates the root "MockTest Hub Locker" folder in the user's Google Drive.
 */
export async function getOrCreateLockerRootFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    "name = 'MockTest Hub Locker' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create the root folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'MockTest Hub Locker',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Official Exam Document Locker created by MockTest Hub Mobile App. Contains Admit Cards, Photos, Signatures and Application Forms.',
    }),
  });

  if (!createRes.ok) {
    const errorJson = await createRes.json();
    throw new Error(errorJson.error?.message || 'Failed to create MockTest Hub Locker folder in Google Drive');
  }

  const created = await createRes.json();
  return created.id;
}

/**
 * Finds or creates a category subfolder inside the root locker folder.
 */
export async function getOrCreateLockerSubFolder(
  accessToken: string,
  rootFolderId: string,
  subFolderName: string
): Promise<string> {
  const query = encodeURIComponent(
    `'${rootFolderId}' in parents and name = '${subFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: subFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    }),
  });

  if (!createRes.ok) {
    const errorJson = await createRes.json();
    throw new Error(errorJson.error?.message || `Failed to create subfolder: ${subFolderName}`);
  }

  const created = await createRes.json();
  return created.id;
}

/**
 * Uploads a local file from React Native file URI directly to Google Drive
 */
export async function uploadNativeFileToGoogleDrive(
  accessToken: string,
  localUri: string,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  thumbnailLink?: string;
}> {
  const metadata: any = {
    name: fileName,
    mimeType: mimeType || 'application/octet-stream',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' }) as any
  );

  // In React Native / Expo FormData:
  formData.append('file', {
    uri: localUri,
    type: mimeType || 'application/octet-stream',
    name: fileName,
  } as any);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to upload document to Google Drive');
  }

  const result = await response.json();
  return {
    id: result.id,
    name: result.name,
    mimeType: result.mimeType,
    size: parseInt(result.size || '0', 10),
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    thumbnailLink: result.thumbnailLink || null,
  };
}

/**
 * Deletes a file from the user's Google Drive.
 */
export async function deleteFileFromGoogleDrive(accessToken: string, fileId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.ok;
}
