const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';
const PART_SIZE = 10 * 1024 * 1024; // B2 minimum part size is 5 MB (except the last part)

export const B2_PREFIX = 'b2:';
export const isB2 = path => typeof path === 'string' && path.startsWith(B2_PREFIX);
export const toKey = path => path.slice(B2_PREFIX.length);
export const isVideoFile = path => /\.(mp4|webm|mov|m4v|ogg)$/i.test(path || '');

// Keep keys safe: no accents/special characters (same reason as the old Supabase InvalidKey bug)
export const safeSegment = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '_');

async function call(path, getToken, options = {}) {
  const token = await getToken();
  if (!token) throw new Error('Please log in again.');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.mStatus !== 'ok') throw new Error(data?.mMessage || 'Storage request failed.');
  return data.mData;
}
const post = (path, getToken, payload) => call(path, getToken, { method: 'POST', body: JSON.stringify(payload) });

function putPart(url, blob, onBytes) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = e => e.lengthComputable && onBytes(e.loaded);
    xhr.onload = () => {
      const etag = xhr.getResponseHeader('ETag');
      if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
      else reject(new Error(`Part upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(blob);
  });
}

async function uploadPartWithRetry(key, uploadId, partNumber, blob, getToken, onBytes) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { url } = await post('/b2/upload/part-url', getToken, { key, uploadId, partNumber });
      return await putPart(url, blob, onBytes);
    } catch (e) {
      lastError = e;
      onBytes(0);
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt)); // 1s, 2s, 4s, 8s, 16s
    }
  }
  throw lastError;
}

/** Uploads a File to B2 under `key`. Resolves with the key. onProgress gets 0-100. */
export async function uploadToB2(file, key, getToken, onProgress) {
  if (!file || !file.size) throw new Error('The selected file is empty.');
  const { uploadId } = await post('/b2/upload/init', getToken, { key, contentType: file.type });
  const totalParts = Math.ceil(file.size / PART_SIZE);
  const parts = [];
  let finishedBytes = 0;
  try {
    for (let n = 1; n <= totalParts; n++) {
      const blob = file.slice((n - 1) * PART_SIZE, n * PART_SIZE);
      const etag = await uploadPartWithRetry(key, uploadId, n, blob, getToken,
        loaded => onProgress?.(Math.round(((finishedBytes + loaded) / file.size) * 100)));
      finishedBytes += blob.size;
      parts.push({ partNumber: n, etag });
      onProgress?.(Math.round((finishedBytes / file.size) * 100));
    }
    await post('/b2/upload/complete', getToken, { key, uploadId, parts });
    return key;
  } catch (e) {
    post('/b2/upload/abort', getToken, { key, uploadId }).catch(() => {});
    throw e;
  }
}

export async function getB2Url(key, getToken) {
  const { url } = await call(`/b2/download-url?key=${encodeURIComponent(key)}`, getToken);
  return url;
}

export function deleteFromB2(keys, getToken) {
  return keys.length ? post('/b2/delete', getToken, { keys }) : Promise.resolve();
}