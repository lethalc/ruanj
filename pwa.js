export const APP_VERSION = '1.1.0';
export function standaloneMode(env = window) {
  return env.navigator.standalone === true || !!env.matchMedia?.('(display-mode: standalone)').matches;
}
export function appleMobile(nav = navigator) {
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}
export async function protectLocalData() {
  if (!navigator.storage?.persist) return null;
  return navigator.storage.persist();
}
function offlineReady(worker) {
  if (!worker) return Promise.resolve(false);
  return new Promise(resolve=>{
    const channel = new MessageChannel();
    const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);};
    const timer=setTimeout(()=>finish(false),1500);
    channel.port1.onmessage=event=>finish(event.data?.version===APP_VERSION && event.data.ready===true);
    try{worker.postMessage({type:'GET_OFFLINE_STATUS'},[channel.port2]);}catch{finish(false);}
  });
}
export function startPWA(onChange) {
  let registration;
  let updateRequested = false;
  let cacheCheckGeneration = 0;
  const status = { version: APP_VERSION, standalone: standaloneMode(), appleMobile: appleMobile(), online: navigator.onLine !== false, cacheReady: false, cacheError: false, updateReady: false, persistent: null };
  const emit = () => onChange({ ...status });
  const checkCache = async worker => {
    const generation = ++cacheCheckGeneration;
    const ready = await offlineReady(worker);
    if (generation !== cacheCheckGeneration) return;
    status.cacheReady = ready;
    emit();
  };
  const refresh = () => {
    status.online = navigator.onLine !== false;
    status.standalone = standaloneMode();
    if (status.online) registration?.update().catch(() => {});
    emit();
  };
  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);
  window.addEventListener('pageshow', refresh);
  navigator.storage?.persisted?.().then(value => { status.persistent = value; emit(); }).catch(() => {});
  if ('serviceWorker' in navigator) {
    const workerUrl = new URL('./sw.js', import.meta.url).href;
    navigator.serviceWorker.register(workerUrl, { updateViaCache: 'none' }).then(reg => {
      registration = reg;
      const sync = () => { status.updateReady = !!reg.waiting; emit(); checkCache(reg.active); };
      const watch = worker => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'redundant') status.cacheError = true;
          sync();
        });
      };
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      sync();
      navigator.serviceWorker.ready.then(sync).catch(() => {});
    }).catch(() => { status.cacheError = true; emit(); });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updateRequested) window.location.reload();
      else { status.updateReady = false; checkCache(navigator.serviceWorker.controller); }
    });
  } else status.cacheError = true;
  emit();
  return {
    status: () => ({ ...status }),
    applyUpdate() {
      if (!registration?.waiting) return false;
      updateRequested = true;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    },
    setPersistent(value) { status.persistent = value; emit(); }
  };
}