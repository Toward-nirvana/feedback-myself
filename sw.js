const CACHE = 'weekly-review-v1';
const FILES = ['./feedback-app.html', './manifest.json'];

// 설치: 앱 파일 캐시 (오프라인 지원)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES).catch(() => {}))
  );
  self.skipWaiting();
});

// 활성화: 오래된 캐시 정리
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();

  // 서비스워커 활성화 시 다음 일요일 알림 예약
  scheduleNextSundayNotification();
});

// 오프라인: 캐시에서 응답
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('./feedback-app.html')))
  );
});

// 알림 클릭: 앱 열기
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('./feedback-app.html');
    })
  );
});

// 앱에서 알림 예약 메시지 수신
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNextSundayNotification();
  }
});

// 다음 일요일 저녁 8시까지 남은 ms 계산
function msUntilNextSunday8pm() {
  const now = new Date();
  const target = new Date(now);
  const day = now.getDay(); // 0=일, 1=월...
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  target.setDate(now.getDate() + daysUntilSunday);
  target.setHours(20, 0, 0, 0);
  return target - now;
}

function scheduleNextSundayNotification() {
  const delay = msUntilNextSunday8pm();
  // 최대 setTimeout 한계(~24.8일)보다 작을 때만 예약
  if (delay < 2_000_000_000) {
    setTimeout(() => {
      self.registration.showNotification('📋 이번 주를 돌아볼 시간이에요', {
        body: '3대 자산 회고를 작성하고 나를 점검해보세요.',
        icon: './favicon.ico',
        badge: './favicon.ico',
        tag: 'weekly-review',
        renotify: true,
        requireInteraction: true,
      });
      // 다음 주도 예약
      scheduleNextSundayNotification();
    }, delay);
  }
}
