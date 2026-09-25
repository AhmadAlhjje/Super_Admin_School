/*
 * Background uploads of the dashboard (Background Fetch): the browser keeps sending videos and
 * files after the site is closed. Registered by src/shared/features/uploads/background.ts under a
 * scope no page uses, so this worker never controls or caches the dashboard.
 *
 * Upload ids: "v|<videoId>|<stamp>|<uploadToken>" or "f|<scope>|<parentId>|<title>|<stamp>|<uploadToken>".
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function parseId(id) {
  const parts = id.split('|');
  if (parts[0] === 'v' && parts.length === 4) return { kind: 'video', videoId: parts[1], token: parts[3] };
  if (parts[0] === 'f' && parts.length === 6) return { kind: 'file' };
  return null;
}

async function completeVideo(upload) {
  // Every chunk arrived: ask the server to prepare the video (retried a few times).
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`/api/v1/videos/${upload.videoId}/upload/complete`, {
        method: 'POST',
        headers: { 'X-Upload-Token': upload.token },
      });
      if (response.ok || response.status < 500) return response.ok;
    } catch {
      // Network: retry below.
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }
  return false;
}

self.addEventListener('backgroundfetchsuccess', (event) => {
  const upload = parseId(event.registration.id);
  event.waitUntil(
    (async () => {
      const done = upload && upload.kind === 'video' ? await completeVideo(upload) : true;
      await event.updateUI({ title: done ? 'اكتمل الرفع ✓' : 'اكتمل الإرسال — افتح لوحة التحكم لإنهاء الرفع' });
    })(),
  );
});

self.addEventListener('backgroundfetchfail', (event) => {
  event.waitUntil(event.updateUI({ title: 'توقف الرفع — افتح لوحة التحكم لإكماله' }));
});

self.addEventListener('backgroundfetchclick', (event) => {
  event.waitUntil(self.clients.openWindow('/'));
});
