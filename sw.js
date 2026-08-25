// Service worker đơn giản cho app "Tra cứu Đối thủ cạnh tranh"
// - Cache các file tĩnh (index.html, manifest.json) để dùng offline
// - data.json luôn lấy mới từ mạng (không cache), tránh hiện dữ liệu cũ

const CACHE_NAME = 'tra-cuu-dtct-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
];

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

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            // Lưu thêm vào cache cho lần sau (chỉ với request GET hợp lệ)
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
