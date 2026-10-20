// Notificações push (importado pelo service worker gerado pelo vite-plugin-pwa)
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: 'Kaowz', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Kaowz';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      renotify: true,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of janelas) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          if ('navigate' in c) { try { await c.navigate(url); } catch (_) { /* ignora */ } }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
