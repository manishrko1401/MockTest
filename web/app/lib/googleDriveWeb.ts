/**
 * Google Drive Web API Client & OAuth2 Handler
 * Uses Google Identity Services (GIS) token client with 'https://www.googleapis.com/auth/drive.file' scope.
 */

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Default Client ID for development and production (can be overridden via process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)
export const DEFAULT_GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '570110856860-a2h946nit7obiguglnjedffflto1oq95.apps.googleusercontent.com';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/**
 * Loads the Google Identity Services script asynchronously.
 */
export function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.google?.accounts?.oauth2) return resolve();

    const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

/**
 * Requests an OAuth 2.0 Access Token from the user for Google Drive.
 */
export async function requestGoogleDriveAccessToken(
  clientId?: string,
  expectedEmail?: string
): Promise<{
  accessToken: string;
  email?: string;
  expiresIn: number;
}> {
  await loadGisScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services failed to initialize');
  }

  const effectiveClientId = clientId || DEFAULT_GOOGLE_CLIENT_ID;

  if (!effectiveClientId || effectiveClientId.includes('mocktesthub-drive') || effectiveClientId.includes('3198adcc')) {
    throw new Error(
      'Google Client ID is missing or invalid. Please create an OAuth 2.0 Web Client ID in Google Cloud Console and set NEXT_PUBLIC_GOOGLE_CLIENT_ID in web/.env.'
    );
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: GOOGLE_DRIVE_SCOPE,
        hint: expectedEmail || undefined,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          if (!tokenResponse.access_token) {
            return reject(new Error('Failed to acquire access token'));
          }

          // Fetch user email via Google userinfo endpoint to verify identity
          let userEmail = '';
          try {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (userinfoRes.ok) {
              const userInfo = await userinfoRes.json();
              userEmail = userInfo.email || '';
            }
          } catch (e) {
            console.warn('Could not fetch Google userinfo:', e);
          }

          // Enforce strict email match if expectedEmail is specified
          if (expectedEmail && userEmail) {
            const cleanExpected = expectedEmail.trim().toLowerCase();
            const cleanConnected = userEmail.trim().toLowerCase();

            if (cleanExpected !== cleanConnected) {
              return reject(
                new Error(
                  `Account Mismatch: Please sign in with your registered account (${expectedEmail}). Connecting with a different Google account (${userEmail}) is not permitted.`
                )
              );
            }
          }

          resolve({
            accessToken: tokenResponse.access_token,
            email: userEmail || expectedEmail,
            expiresIn: tokenResponse.expires_in || 3599,
          });
        },
      });

      client.requestAccessToken({ prompt: 'consent', hint: expectedEmail || undefined });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sign In / Sign Up with Google (combines user profile with Drive access)
 */
export async function signInWithGoogle(clientId?: string): Promise<{
  accessToken: string;
  email: string;
  name: string;
  picture?: string;
  googleId?: string;
  expiresIn: number;
}> {
  await loadGisScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services failed to initialize');
  }

  const effectiveClientId = clientId || DEFAULT_GOOGLE_CLIENT_ID;

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: 'email profile openid https://www.googleapis.com/auth/drive.file',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          if (!tokenResponse.access_token) {
            return reject(new Error('Failed to acquire Google access token'));
          }

          try {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (!userinfoRes.ok) {
              return reject(new Error('Failed to retrieve Google profile information'));
            }
            const userInfo = await userinfoRes.json();
            if (!userInfo.email) {
              return reject(new Error('No email found associated with this Google account'));
            }

            resolve({
              accessToken: tokenResponse.access_token,
              email: userInfo.email,
              name: userInfo.name || userInfo.given_name || 'Student',
              picture: userInfo.picture,
              googleId: userInfo.sub,
              expiresIn: tokenResponse.expires_in || 3599,
            });
          } catch (err) {
            reject(err);
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
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
      description: 'Official Exam Document Locker created by MockTest Hub. Contains Admit Cards, Photos, Signatures and Application Forms.',
    }),
  });

  if (!createRes.ok) {
    const errorJson = await createRes.json();
    throw new Error(errorJson.error?.message || 'Failed to create MockTest Hub Locker folder');
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
 * Finds or creates a dedicated folder for an applied exam inside the root locker folder.
 * Returns both folderId and the webViewLink to open directly in Google Drive.
 */
export async function getOrCreateExamFolder(
  accessToken: string,
  rootFolderId: string,
  examName: string
): Promise<{ folderId: string; folderWebViewLink: string }> {
  // Sanitize folder name by trimming and removing slashes
  const sanitizedName = examName.trim().replace(/[/\\?%*:|"<>]/g, '-');
  const folderName = sanitizedName || 'General Exam Documents';

  const query = encodeURIComponent(
    `'${rootFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const f = data.files[0];
      return {
        folderId: f.id,
        folderWebViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      };
    }
  }

  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: `MockTest Hub Exam Documents & Admit Cards for ${folderName}`,
        parents: [rootFolderId],
      }),
    }
  );

  if (!createRes.ok) {
    const errorJson = await createRes.json();
    throw new Error(errorJson.error?.message || `Failed to create exam folder: ${folderName}`);
  }

  const created = await createRes.json();
  return {
    folderId: created.id,
    folderWebViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

/**
 * Uploads a file (Blob / File) directly to Google Drive via multipart REST API.
 */
export async function uploadFileToGoogleDrive(
  accessToken: string,
  file: File | Blob,
  fileName: string,
  folderId?: string
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
}> {
  const metadata: any = {
    name: fileName,
    mimeType: file.type || 'application/octet-stream',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' })
  );
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
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
    webContentLink: result.webContentLink || `https://drive.google.com/uc?export=download&id=${result.id}`,
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
