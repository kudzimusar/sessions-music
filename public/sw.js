const CACHE='sessions-booking-references-v1';

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 if(event.data?.type==='CLEAR_BOOKING_REFERENCE_CACHE')event.waitUntil(caches.delete(CACHE));
 if(event.data?.type==='CACHE_BOOKING_REFERENCE'&&event.data.requestUrl&&event.data.payload){event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.put(event.data.requestUrl,new Response(JSON.stringify(event.data.payload),{headers:{'Content-Type':'application/json','X-Sessions-Offline-Reference':'1'}}));})());}
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname!=='/api/bookings/offline')return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}catch{const saved=await cache.match(event.request);if(saved)return saved;return new Response(JSON.stringify({error:'No saved booking reference on this device'}),{status:503,headers:{'Content-Type':'application/json','X-Sessions-Offline-Reference':'1'}});}
 })());
});
