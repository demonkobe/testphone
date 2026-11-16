// Service worker đơn giản cho app "Tra cứu Đối thủ cạnh tranh"
// - Cache các file tĩnh (index.html, manifest.json) để dùng offline
// - data.json luôn lấy mới từ mạng (không cache), tránh hiện dữ liệu cũ

// QUAN TRỌNG: đổi số version này (v2, v3, v4...) MỖI KHI deploy code mới lên GitHub.
// Nếu không đổi, trình duyệt cũ của bạn/người dùng sẽ tiếp tục dùng bản index.html
// cache cũ dù file thật trên server đã thay đổi -> ra số liệu khác nhau như bạn gặp.
const CACHE_NAME = 'tra-cuu-dtct-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
];
// Các request luôn ưu tiên lấy MỚI từ mạng trước (chỉ fallback về cache khi mất mạng)
const NETWORK_FIRST = ['index.html', './', 'manifest.json'];

// Cài đặt: cache trước các file tĩnh của app
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Kích hoạt: xóa cache cũ nếu có phiên bản mới
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Xử lý fetch:
// - data.json: luôn lấy từ mạng (network-only), không cache, để dữ liệu luôn mới
// - Các request khác: thử cache trước, nếu không có thì lấy từ mạng (cache-first)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('data.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isAppShell =
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname === new URL('./', self.registration.scope).pathname;

  if (isAppShell) {
    // network-first: luôn thử lấy bản mới nhất, chỉ dùng cache khi mất mạng
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (event.request.method === 'GET' && response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Các file tĩnh khác (icon, css, js phụ...): cache-first như cũ
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            if (event.request.method === 'GET' && response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
