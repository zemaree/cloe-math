const CACHE='cloe-math-v23';
const FILES=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('cloe-math-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin) return;

  const url=new URL(request.url);
  const isAppDocument=request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/manifest.webmanifest');

  if(isAppDocument){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const freshRequest=new Request(request,{cache:'no-store'});
        const response=await fetch(freshRequest);
        if(response&&response.ok) await cache.put(request,response.clone());
        return response;
      }catch(error){
        const cached=await cache.match(request)||await cache.match('./index.html')||await cache.match('./');
        if(cached) return cached;
        throw error;
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached) return cached;
    const response=await fetch(request);
    if(response&&response.ok){
      const cache=await caches.open(CACHE);
      await cache.put(request,response.clone());
    }
    return response;
  })());
});
