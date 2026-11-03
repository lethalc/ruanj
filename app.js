import { CATEGORIES, STORAGE_KEY, dateKey, parseDate, shiftDate, weekStart, newState, id, normalizeState, createBackup, readBackup, dayStats, weekStats, streak, hasActivity } from './model.js?v=1.1.0';
import { APP_VERSION, startPWA, standaloneMode, appleMobile, protectLocalData } from './pwa.js?v=1.1.0';
const appAsset = path => new URL(path, import.meta.url).href;

const paths = {
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
 book:'<path d="M12 6c-3-2-7-2-10 0v15c3-2 7-2 10 0 3-2 7-2 10 0V6c-3-2-7-2-10 0Zm0 0v15"/>',
 chart:'<path d="M4 3v18h17M9 16v-4m5 4V8m5 8V5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="m9 5 7 7-7 7"/>',
 left:'<path d="m15 5-7 7 7 7"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 edit:'<path d="m16 3 5 5-12 12H4v-5Zm-3 3 5 5"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3m-10 0 1 15h12l1-15M10 10v7m4-7v7"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
 leaf:'<path d="M20 3c-7-1-16 3-16 10a7 7 0 0 0 7 7c7 0 10-10 9-17ZM4 21 15 10"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 4 3 2 3-1 2 4 3-1 1-3 4-1 1-4-3-2 1-3-3-2-3 1-2-3Z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 flag:'<path d="M5 21V3c5-3 9 4 14 0v11c-5 4-9-3-14 0"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>',
 coffee:'<path d="M3 8h13v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Zm13 0h2a3 3 0 0 1 0 6h-2M6 2v3m4-3v3m4-3v3"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sun}</svg>`;
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
let state = newState(), storageProblem = false, storageConflict = false, lastStoredRaw = null;
try { lastStoredRaw = localStorage.getItem(STORAGE_KEY); if (lastStoredRaw) state = normalizeState(JSON.parse(lastStoredRaw)); }
catch { storageProblem = true; }
let activeTab = 'today', selectedDate = dateKey(), reviewStart = weekStart(dateKey()), planFilter = 'today', showCompleted = false, searchQuery = '', entryCategory = '工作';
let toastTimer, undoAction;
let runtime = { version: APP_VERSION, standalone: standaloneMode(), appleMobile: appleMobile(), online: navigator.onLine !== false, cacheReady: false, cacheError: false, updateReady: false, persistent: null };
let pwaController;
let installHintDismissed = false;
try { installHintDismissed = localStorage.getItem('dayline.install-hint-dismissed') === '1'; } catch {}
let knownToday = dateKey();
const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
const weekday = d => weekdays[parseDate(d).getDay()];
const shortDate = d => `${parseDate(d).getMonth()+1}月${parseDate(d).getDate()}日`;
const friendlyDate = d => d === dateKey() ? '今天' : d === shiftDate(dateKey(), 1) ? '明天' : d === shiftDate(dateKey(), -1) ? '昨天' : shortDate(d);
const timeNow = () => new Date().toTimeString().slice(0, 5);
const duration = mins => mins >= 60 ? `${Math.floor(mins/60)}小时${mins%60 ? `${mins%60}分` : ''}` : `${mins}分钟`;
const categoryClass = c => ['work', 'study', 'life', 'health'][CATEGORIES.indexOf(c)] || 'life';

function save() {
  if (storageProblem || storageConflict) return false;
  try {
    if (localStorage.getItem(STORAGE_KEY) !== lastStoredRaw) { storageConflict = true; return false; }
    const raw = JSON.stringify(state); localStorage.setItem(STORAGE_KEY, raw); lastStoredRaw = raw; return true;
  }
  catch { storageProblem = true; toast('保存失败，请导出备份以保留这次修改。'); return false; }
}
function savedToast(saved, message) { toast(saved ? message : storageConflict ? '其他页面已更新。请先导出本页记录，再刷新。' : '修改仅暂存在本页，请导出备份。'); }
function toast(message, action) {
  clearTimeout(toastTimer); undoAction = action;
  const el = document.querySelector('#toast');
  el.innerHTML = `${icon('check')}<span>${escape(message)}</span>${action ? '<button data-action="undo">撤销</button>' : ''}`;
  el.classList.add('visible'); toastTimer = setTimeout(() => el.classList.remove('visible'), action ? 8000 : 3500);
}
function pageTitle() {
  return ({today:['把今天，过得有条有理。','留一点时间，给认真生活的自己。'], plan:['把想做的，慢慢做成。','给重要的事留位置，也给自己留余地。'], journal:['平凡的一天，也值得记录。','你认真度过的每一刻，都有迹可循。'], review:['每一小步，都算数。','回头看看，你已经走了多远。']})[activeTab];
}
function datePicker() {
  return `<div class="date-picker"><button class="icon-button" data-action="prev-day" aria-label="前一天">${icon('left')}</button><label class="date-label">${icon('calendar')}<span>${friendlyDate(selectedDate)}<small>${weekday(selectedDate)}</small></span><input type="date" id="selected-date" value="${selectedDate}" aria-label="选择日期"></label><button class="icon-button" data-action="next-day" aria-label="后一天">${icon('arrow')}</button>${selectedDate !== dateKey() ? '<button class="back-today" data-action="back-today">今天</button>' : ''}</div>`;
}
function render() {
  const titles = pageTitle();
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#" data-action="nav" data-tab="today" aria-label="日序首页"><img src="${appAsset("icon.svg")}" alt=""><span>日序<small>DAYLINE</small></span></a><p class="nav-caption">我的每一天</p><nav aria-label="主导航">${[['today','sun','今日','TODAY'],['plan','calendar','计划','PLAN'],['journal','book','记录','JOURNAL'],['review','chart','回顾','REFLECT']].map(([tab, ic, label, en]) => `<button class="nav-item ${activeTab === tab ? 'active' : ''}" data-action="nav" data-tab="${tab}" ${activeTab === tab ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span><small>${en}</small>${activeTab === tab ? '<i></i>' : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-note">${icon('leaf')}<p>不用一下子很厉害，<br>每天好一点就很好。</p><span>ONE DAY AT A TIME</span></div><button class="settings-button" data-action="settings">${icon('settings')}<span>设置与备份</span>${icon('arrow')}</button><div class="local-status"><i class="${storageProblem ? 'warning' : ''}"></i>${storageProblem ? '本机存储异常，请导出' : '记录保存在这台设备'}</div></div></aside>
  <main><header class="topbar"><span class="breadcrumb">我的空间 <span>/</span> ${({today:'今日概览',plan:'计划统筹',journal:'生活记录',review:'每周回顾'})[activeTab]}</span><span class="topbar-date">${new Date().getFullYear()}年 ${shortDate(dateKey())} <span>${weekday(dateKey())}</span></span><button class="avatar" data-action="settings" aria-label="个人设置">${escape(state.settings.name?.slice(0,1) || '我')}</button></header><div class="page-content"><div class="page-heading"><div><p class="eyebrow">${({today:'A LITTLE BETTER, EVERY DAY',plan:'MAKE ROOM FOR WHAT MATTERS',journal:'YOUR DAYS, YOUR STORIES',review:'SMALL STEPS, REAL PROGRESS'})[activeTab]}</p><h1>${titles[0]}</h1><p class="subtitle">${titles[1]}</p></div>${activeTab !== 'review' ? datePicker() : ''}</div>${storageProblem ? '<div class="storage-banner">本机存储无法正常读写。请到「设置与备份」导出数据，避免关闭后丢失。</div>' : ''}${({today:renderToday,plan:renderPlan,journal:renderJournal,review:renderReview})[activeTab]() }<footer class="page-footer"><span>日序 DAYLINE</span><span>让每一天，都有回响。</span>${icon('leaf')}</footer></div></main><nav class="mobile-nav" aria-label="手机导航">${[['today','sun','今日'],['plan','calendar','计划'],['journal','book','记录'],['review','chart','回顾']].map(([tab,ic,label])=>`<button data-action="nav" data-tab="${tab}" class="${activeTab===tab?'active':''}" ${activeTab===tab?'aria-current="page"':''}>${icon(ic)}<span>${label}</span></button>`).join('')}<button data-action="settings" aria-label="设置与备份">${icon('settings')}<span>设置</span></button></nav>`;
  const runtimeContainer = document.createElement('div'); runtimeContainer.id = 'runtime-ui';
  document.querySelector('.page-heading').after(runtimeContainer);
  refreshRuntimeUI();
  app.insertAdjacentHTML('beforeend', `<button class="quick-fab" data-action="new-entry" aria-label="快速记录">${icon('plus')}<span>记一笔</span></button>`);
  document.querySelector('.recent-header button')?.setAttribute('aria-label', '查看全部记录');
  if (storageConflict) {
    const banner = document.createElement('div'); banner.className='storage-banner'; banner.textContent='其他页面更新了记录。为避免覆盖，本页修改暂未写入。请先导出本页备份，再刷新页面。';
    document.querySelector('.page-heading').after(banner);
    const status=document.querySelector('.local-status'); if(status)status.textContent='其他页面有更新，请先备份';
    const reflectionStatus=document.querySelector('#reflection-status');if(reflectionStatus)reflectionStatus.textContent='尚未保存，请先备份';
  }
}
function renderToday() {
  const stats = dayStats(state, selectedDate);
  const tasks = state.tasks.filter(t=>t.date===selectedDate).sort((a,b)=>Number(b.priority==='high')-Number(a.priority==='high') || a.time.localeCompare(b.time));
  const entries = state.entries.filter(e=>e.date===selectedDate).sort((a,b)=>b.time.localeCompare(a.time));
  const focus = tasks.find(t=>t.priority==='high' && !t.completed);
  const r = state.reflections[selectedDate];
  return `<section class="hero-grid"><div class="intent-card"><div class="intent-content"><span class="pill-light">${icon('spark')} ${selectedDate===dateKey()?'给今天一个小方向':'给这一天一个小方向'}</span><h2>${focus ? escape(focus.title) : '有计划地努力，<br>有记录地生活。'}</h2><p>${focus ? `${escape(focus.category)} · ${focus.time || '按自己的节奏来'} · 今天最值得认真对待的事` : '不必填满每一分钟，做好眼前的一件事。'}</p><button class="hero-button" data-action="${focus?'edit-task':'new-task'}" ${focus?`data-id="${focus.id}"`:'data-priority="high"'}>${focus?'查看今日重点':'写下今天的重点'}${icon('arrow')}</button></div><svg class="hero-art" width="248" height="230" viewBox="0 0 248 230" fill="none" aria-hidden="true"><circle cx="136" cy="109" r="91" stroke="#90AB83" stroke-opacity=".24"/><circle cx="136" cy="109" r="66" stroke="#90AB83" stroke-opacity=".24"/><circle cx="136" cy="109" r="41" stroke="#90AB83" stroke-opacity=".24"/><path d="M134 204c-1-75 12-105 34-155" stroke="#BFCF99" stroke-width="2"/><path d="M144 143c-38-1-62-29-57-60 33 4 55 24 57 60Z" fill="#A8C185"/><path d="M153 112c33-2 57-28 52-59-30 7-48 23-52 59Z" fill="#CED9A7"/><path d="M136 174c-27 1-51-13-57-37 29-5 50 9 57 37Z" fill="#76976A"/><path d="M166 77c-18-18-14-45 8-63 12 20 7 45-8 63Z" fill="#D9D9A0"/><circle cx="72" cy="41" r="5" fill="#E2D6AC"/><path d="M210 153v12m-6-6h12" stroke="#B8C69B" stroke-width="1.5"/></svg></div><div class="progress-card"><div class="card-kicker">${icon('target')} 今日进度</div><div class="progress-main"><div class="progress-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="49" fill="none" stroke="#edf0e8" stroke-width="8"/><circle cx="60" cy="60" r="49" fill="none" stroke="#628065" stroke-width="8" stroke-linecap="round" stroke-dasharray="${stats.percent*3.079} 307.9" transform="rotate(-90 60 60)"/></svg><span>${stats.percent}<small>%</small></span></div><div><strong>${stats.complete}<span> / ${stats.tasks}</span></strong><p>项计划已完成</p><small>${stats.tasks===0?'从一件小事开始':stats.percent===100?'做得很好，给自己一点掌声':'按自己的节奏，慢慢来'}</small></div></div><div class="progress-foot"><span>${icon('clock')} 已记录 <b>${duration(stats.minutes)}</b></span><span>${icon('book')} ${stats.entries} 条记录</span></div></div></section>
  <div class="today-grid"><section class="panel task-panel"><div class="section-header"><h2>今日计划 <span class="count">${stats.tasks}</span></h2><button class="text-button" data-action="nav" data-tab="plan">全部计划 ${icon('arrow')}</button></div><div class="section-note">把重要的事，放在心上。<span>${icon('flag')} 最多 3 个重点</span></div>${tasks.length ? `<div class="task-list">${tasks.map(taskRow).join('')}</div>` : `<div class="empty-state plan-empty"><div class="empty-symbol">${icon('calendar')}<span>${icon('plus')}</span></div><h3>今天，想完成什么？</h3><p>不用安排太多，从一件重要的小事开始。</p><button class="button primary" data-action="new-task">${icon('plus')} 添加第一个计划</button></div>`}${tasks.length ? '<button class="add-dashed" data-action="new-task">'+icon('plus')+' 添加一个计划</button>' : '<div class="gentle-note">'+icon('leaf')+' 留白，也是计划的一部分。</div>'}</section><section class="panel quick-panel"><div class="section-header"><h2>此刻，记一笔</h2><span class="tiny-label">LIFE IN MOMENTS</span></div><p class="muted">做了什么、学到了什么，都值得留下。</p><form id="quick-entry"><label class="sr-only" for="quick-text">记录内容</label><textarea id="quick-text" name="text" rows="3" maxlength="2000" placeholder="刚刚完成了什么？哪怕是一件小事…" required></textarea><div class="category-pills">${CATEGORIES.map(c=>`<label class="category-choice ${categoryClass(c)}"><input type="radio" name="category" value="${c}" ${c===entryCategory?'checked':''}><span>${c}</span></label>`).join('')}</div><div class="quick-bottom"><label class="minutes-label">${icon('clock')}<input type="number" name="minutes" value="30" min="0" max="1440" required aria-label="记录时长（分钟）"><span>分钟</span></label><button class="button primary" type="submit">记下来 ${icon('arrow')}</button></div></form><div class="recent-header"><span>最近的片刻</span><button class="text-button" data-action="nav" data-tab="journal">${icon('arrow')}</button></div>${entries.length?`<div class="mini-timeline">${entries.slice(0,2).map(e=>`<button class="mini-entry" data-action="edit-entry" data-id="${e.id}"><span class="timeline-dot ${categoryClass(e.category)}"></span><div><p>${escape(e.text)}</p><small>${e.time || '--:--'} · ${escape(e.category)} · ${duration(e.minutes)}</small></div></button>`).join('')}</div>`:'<div class="quiet-empty">还没有记录。今天的故事，等你来写。</div>'}</section></div><section class="reflection-banner"><div class="reflection-icon">${icon(r?.win?'check':'coffee')}</div><div><h3>${r?.win?'今天的收获，已经好好收下。':'睡前，把这一天轻轻收好。'}</h3><p>${r?.win?escape(r.win):'花两分钟回望，让明天的自己走得更从容。'}</p></div><button class="text-button" data-action="reflect">${r?.win?'查看复盘':'写今日复盘'} ${icon('arrow')}</button></section>`;
}
function taskRow(task) {
  const overdue = task.date < dateKey() && !task.completed;
  return `<div class="task-row ${task.completed?'is-complete':''}"><button class="task-check ${task.completed?'checked':''}" data-action="toggle-task" data-id="${task.id}" aria-label="${task.completed?'重新打开':'完成'}计划：${escape(task.title)}" aria-pressed="${task.completed}">${task.completed?icon('check'):''}</button><button class="task-body" data-action="edit-task" data-id="${task.id}"><span class="task-title">${escape(task.title)}${task.priority==='high'?'<span class="priority-mark" title="重点">'+icon('flag')+'</span>':''}</span><span class="task-meta"><span class="tag ${categoryClass(task.category)}">${escape(task.category)}</span>${task.time?`<span>${icon('clock')} ${task.time}</span>`:''}${task.minutes?`<span>${duration(task.minutes)}</span>`:''}${overdue?'<span class="overdue">已逾期</span>':''}</span></button><button class="icon-button row-edit" data-action="edit-task" data-id="${task.id}" aria-label="编辑计划">${icon('dots')}</button></div>`;
}
function renderPlan() {
  const start=weekStart(selectedDate);
  let tasks = state.tasks.filter(t=>{
    const match = planFilter==='all' || (planFilter==='today' && t.date===selectedDate) || (planFilter==='week' && t.date>=start && t.date<=shiftDate(start,6)) || (planFilter==='overdue' && t.date<dateKey() && !t.completed);
    return match && (showCompleted || !t.completed) && (!searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }).sort((a,b)=>a.date.localeCompare(b.date) || Number(a.completed)-Number(b.completed) || Number(b.priority==='high')-Number(a.priority==='high') || a.time.localeCompare(b.time));
  const groups = [...new Set(tasks.map(t=>t.date))];
  return `<section class="week-strip">${Array.from({length:7},(_,i)=>{const d=shiftDate(start,i);const count=state.tasks.filter(t=>t.date===d&&!t.completed).length;return `<button class="week-day ${d===selectedDate?'selected':''} ${d===dateKey()?'is-today':''}" data-action="select-date" data-date="${d}"><span>${weekday(d)}</span><strong>${parseDate(d).getDate()}</strong><small>${count?`${count} 项待办`:d===dateKey()?'今天':'·'}</small></button>`;}).join('')}</section><section class="panel plan-page-panel"><div class="section-header"><h2>我的计划 <span class="count">${tasks.length}</span></h2><button class="button primary" data-action="new-task">${icon('plus')} 新建计划</button></div><div class="plan-toolbar"><div class="segmented">${[['today','当天'],['week','本周'],['all','全部'],['overdue','逾期']].map(([f,l])=>`<button class="${planFilter===f?'active':''}" data-action="plan-filter" data-filter="${f}">${l}</button>`).join('')}</div><label class="completed-toggle"><input type="checkbox" id="show-completed" ${showCompleted?'checked':''}>显示已完成</label><label class="search-box">${icon('search')}<input id="task-search" type="search" placeholder="搜索计划" value="${escape(searchQuery)}" aria-label="搜索计划"></label></div><div id="plan-results">${groups.length?groups.map(d=>`<div class="task-group"><div class="group-label">${friendlyDate(d)}<span>${d} · ${weekday(d)}</span></div>${tasks.filter(t=>t.date===d).map(taskRow).join('')}</div>`).join(''):`<div class="empty-state large"><div class="empty-symbol">${icon('calendar')}</div><h3>${searchQuery?'没有找到这个计划':planFilter==='overdue'?'没有逾期的计划':'给未来，留一个小小的约定'}</h3><p>${searchQuery?'试试其他关键词。':planFilter==='overdue'?'按自己的节奏继续就好。':'学习、工作、生活，都可以从这里安排。'}</p>${!searchQuery&&planFilter!=='overdue'?'<button class="button primary" data-action="new-task">'+icon('plus')+' 新建计划</button>':''}</div>`}</div></section>`;
}
function reflectionForm() {
  const r = state.reflections[selectedDate] || {};
  return `<section class="panel reflection-panel" id="reflection-panel"><div class="section-header"><h2>${icon('heart')} 一天的小复盘</h2><span class="autosave-label" id="reflection-status">${storageProblem?'未能保存':'随写随存'}</span></div><p class="muted">不用评判自己，只是温柔地看一看。</p><p class="field-label">今天的心情，是哪一种？</p><div class="mood-picker" role="group" aria-label="今天的心情">${[['☁','有点累'],['◔','平平淡淡'],['◡','还不错'],['☀','很开心'],['✧','超有成就']].map(([face,label],i)=>`<button class="mood ${r.mood===i+1?'selected':''}" data-action="mood" data-value="${i+1}" aria-pressed="${r.mood===i+1}" aria-label="${label}"><span>${face}</span><small>${label}</small></button>`).join('')}</div><form id="reflection-form">${[['win','今天做得不错的一件事','小小的进步，也值得被看见。'],['improve','哪里可以更轻松一点','不必苛责，只寻找一个小调整。'],['tomorrow','明天，想先做好什么','给明天的自己留一句提醒。']].map(([key,label,placeholder])=>`<label class="reflection-field"><span>${label}</span><textarea name="${key}" rows="2" maxlength="2000" placeholder="${placeholder}">${escape(r[key]||'')}</textarea></label>`).join('')}</form></section>`;
}
function renderJournal() {
  const entries = state.entries.filter(e=>e.date===selectedDate).sort((a,b)=>b.time.localeCompare(a.time));
  const stats=dayStats(state,selectedDate);
  return `<div class="journal-grid"><section class="panel journal-panel"><div class="section-header"><h2>这一天的片刻 <span class="count">${entries.length}</span></h2><button class="button primary" data-action="new-entry">${icon('plus')} 写记录</button></div><div class="journal-summary">${icon('clock')} 共记录 ${duration(stats.minutes)}<span>·</span>${shortDate(selectedDate)} ${weekday(selectedDate)}</div>${entries.length?`<div class="full-timeline">${entries.map(e=>`<article class="journal-entry"><div class="entry-time">${e.time||'随记'}<i class="${categoryClass(e.category)}"></i></div><div class="entry-card"><div><span class="tag ${categoryClass(e.category)}">${escape(e.category)}</span><span class="entry-duration">${duration(e.minutes)}</span><button class="icon-button" data-action="edit-entry" data-id="${e.id}" aria-label="编辑记录">${icon('dots')}</button></div><p>${escape(e.text)}</p></div></article>`).join('')}</div>`:`<div class="empty-state large"><div class="empty-symbol">${icon('book')}</div><h3>留住今天的第一个片刻</h3><p>读了几页书、认真工作了一会儿，<br>或是好好吃了一顿饭。</p><button class="button secondary" data-action="new-entry">写下第一条记录 ${icon('arrow')}</button></div>`}</section>${reflectionForm()}</div>`;
}
function renderReview() {
  const stats=weekStats(state,reviewStart), end=shiftDate(reviewStart,6);
  const rate=stats.tasks?Math.round(stats.complete/stats.tasks*100):0;
  const categories=CATEGORIES.map(c=>({name:c,minutes:state.entries.filter(e=>e.category===c && e.date>=reviewStart && e.date<=end).reduce((a,e)=>a+e.minutes,0)}));
  const max=Math.max(1,...stats.days.map(d=>d.minutes));
  const heatStart=shiftDate(dateKey(),-27);
  return `<div class="review-heading"><div><span class="pill-soft">${icon('leaf')} 每周一小步</span><h2>${stats.entries||stats.complete?'有在认真生活，就值得肯定。':'属于你的进步，正在路上。'}</h2></div><div class="week-switch"><button class="icon-button" data-action="prev-week" aria-label="前一周">${icon('left')}</button><span>${shortDate(reviewStart)} — ${shortDate(end)}<small>${reviewStart.slice(0,4)} · ${reviewStart===weekStart(dateKey())?'本周':'每周回顾'}</small></span><button class="icon-button" data-action="next-week" aria-label="后一周">${icon('arrow')}</button></div></div><section class="stats-grid">${[[stats.complete,'完成计划','项','check',`${stats.tasks} 项计划 · 完成率 ${rate}%`],[duration(stats.minutes),'记录时长','','clock',`${stats.entries} 条生活记录`],[stats.activeDays,'活跃天数','天','sun','有记录、完成计划或写复盘'],[streak(state),'当前连续','天','leaf','从今天或昨天开始向前计算']].map(([n,l,u,ic,sub])=>`<div class="stat-card"><span>${icon(ic)} ${l}</span><strong>${n}<small>${u}</small></strong><p>${sub}</p></div>`).join('')}</section><div class="review-grid"><section class="panel chart-panel"><div class="section-header"><h2>这一周的投入</h2><span class="chart-legend"><i></i> 记录时长</span></div><p class="muted">不求每天满格，只求持续向前。</p><div class="bar-chart">${stats.days.map(d=>`<button class="chart-column ${d.date===dateKey()?'is-today':''}" data-action="view-day" data-date="${d.date}" aria-label="${shortDate(d.date)}记录${duration(d.minutes)}，完成${d.complete}项计划"><span class="bar-value">${d.minutes?duration(d.minutes):'—'}</span><span class="bar-track"><span class="bar-fill ${d.minutes?'':'empty-bar'}" style="height:${d.minutes?Math.max(4,d.minutes/max*100):3}%"></span></span><strong>${weekday(d.date)}</strong><small>${parseDate(d.date).getDate()}</small></button>`).join('')}</div></section><section class="panel category-panel"><div class="section-header"><h2>时间，花在了哪里</h2>${icon('clock')}</div><p class="muted">根据这一周记录的时长统计。</p><div class="category-bars">${categories.map(c=>`<div><span><i class="category-dot ${categoryClass(c.name)}"></i>${c.name}<small>${duration(c.minutes)}</small></span><div class="category-track"><i class="${categoryClass(c.name)}" style="width:${stats.minutes?c.minutes/stats.minutes*100:0}%"></i></div></div>`).join('')}</div>${!stats.minutes?'<p class="small-hint">为记录加上时长，这里就会慢慢长出答案。</p>':''}</section></div><section class="panel rhythm-panel"><div><div class="section-header"><h2>生活的节奏</h2><span class="tiny-label">LAST 28 DAYS</span></div><p class="muted">完成计划、记下生活或写下复盘，都算认真过了一天。</p></div><div class="heatmap" role="group" aria-label="最近28天活跃情况">${Array.from({length:28},(_,i)=>{const d=shiftDate(heatStart,i),s=dayStats(state,d);const activity=hasActivity(state,d);return `<button class="heat-cell ${activity?'level-'+Math.min(3,Math.max(1,Math.ceil((s.entries+s.complete)/3))):''}" data-action="view-day" data-date="${d}" title="${d}：${activity?'有留下足迹':'暂无记录'}" aria-label="${d}，${activity?'有留下足迹':'暂无记录'}">${parseDate(d).getDate()}</button>`;}).join('')}</div><div class="heatmap-footer"><span>${shortDate(heatStart)} — ${shortDate(dateKey())}</span><span>少 <i></i><i></i><i></i><i></i> 多</span></div></section>`;
}
function openModal(content) { modal.innerHTML=`<div class="modal-content">${content}</div>`; modal.showModal(); }
function modalHeader(eyebrow,title) { return `<div class="modal-header"><div><p class="eyebrow">${eyebrow}</p><h2 id="modal-title">${title}</h2></div><button type="button" class="icon-button" data-action="close-modal" aria-label="关闭">${icon('close')}</button></div>`; }
function taskModal(taskID, priority='normal') {
  const t=state.tasks.find(t=>t.id===taskID);
  openModal(`${modalHeader('ONE THING AT A TIME',t?'编辑计划':'给生活加一个计划')}<form id="task-form" data-id="${t?.id||''}"><label class="form-field"><span>想完成什么 <small>必填</small></span><input name="title" placeholder="例如：读完一本书的第一章" value="${escape(t?.title||'')}" maxlength="180" required autofocus></label><div class="form-grid"><label class="form-field"><span>安排日期</span><input type="date" name="date" value="${t?.date||selectedDate}" required></label><label class="form-field"><span>开始时间 <small>可选</small></span><input type="time" name="time" value="${t?.time||''}"></label><label class="form-field"><span>分类</span><select name="category">${CATEGORIES.map(c=>`<option ${t?.category===c?'selected':''}>${c}</option>`).join('')}</select></label><label class="form-field"><span>预计用时（分钟）</span><input type="number" name="minutes" min="0" max="1440" value="${t?.minutes??30}" required></label></div><label class="priority-control"><input type="checkbox" name="priority" ${((t?.priority||priority)==='high')?'checked':''}><span class="priority-icon">${icon('flag')}</span><span><b>设为当天重点</b><small>每天最多 3 件，把精力留给重要的事。</small></span></label><div class="modal-footer">${t?'<button class="button danger-quiet" type="button" data-action="delete-task" data-id="'+t.id+'">'+icon('trash')+' 删除</button>':'<span class="form-footnote">小目标，也值得认真对待。</span>'}<button class="button primary" type="submit">${icon('check')} 保存计划</button></div></form>`);
}
function entryModal(entryID) {
  const e=state.entries.find(e=>e.id===entryID);
  openModal(`${modalHeader('A MOMENT WORTH KEEPING',e?'编辑生活记录':'记下一个生活片刻')}<form id="entry-form" data-id="${e?.id||''}"><label class="form-field"><span>做了什么、有什么收获 <small>必填</small></span><textarea name="text" rows="4" maxlength="2000" placeholder="刚刚做过的事，值得记下来。" required autofocus>${escape(e?.text||'')}</textarea></label><div class="form-grid"><label class="form-field"><span>日期</span><input name="date" type="date" value="${e?.date||selectedDate}" required></label><label class="form-field"><span>时间</span><input name="time" type="time" value="${e?.time||timeNow()}" required></label><label class="form-field"><span>分类</span><select name="category">${CATEGORIES.map(c=>`<option ${e?.category===c?'selected':''}>${c}</option>`).join('')}</select></label><label class="form-field"><span>投入时长（分钟）</span><input type="number" name="minutes" min="0" max="1440" value="${e?.minutes??30}" required></label></div><div class="modal-footer">${e?'<button class="button danger-quiet" type="button" data-action="delete-entry" data-id="'+e.id+'">'+icon('trash')+' 删除</button>':'<span class="form-footnote">一点一滴，都在成为更好的你。</span>'}<button class="button primary" type="submit">${icon('check')} 保存记录</button></div></form>`);
}
function settingsModal() {
  openModal(`${modalHeader('YOUR LITTLE SPACE','让日序，更像你')}<form id="settings-form"><label class="form-field"><span>怎么称呼你</span><input name="name" maxlength="24" placeholder="你的名字或昵称" value="${escape(state.settings.name)}"></label><button class="button primary" type="submit">保存昵称 ${icon('check')}</button></form><div class="settings-section"><h3>给记录一份备份</h3><p>数据保存在当前浏览器和设备中。更换设备或清理浏览器前，可以先导出；不同设备之间不会自动同步。</p><div class="backup-actions"><button class="button secondary" data-action="export">${icon('download')} 导出备份</button><button class="button secondary" data-action="import">${icon('upload')} 导入备份</button></div>${storageProblem?'<button class="text-button" data-action="export-raw">导出原始存储文件</button>':''}</div><div class="settings-section install-guide"><span class="install-icon">${icon('phone')}</span><div><h3>把日序放进口袋</h3><p>用 iPhone 的 Safari 打开这个网址，点「分享」→「添加到主屏幕」，就能像 App 一样打开。</p><small>浏览器版本 · 本地存储 · 支持离线使用已缓存页面</small></div></div><div class="settings-bottom"><img src="${appAsset("icon.svg")}" alt=""><div>日序 <span>DAYLINE 1.0</span><p>用计划照顾未来，用记录珍藏今天。</p></div></div>`);
  const guide = modal.querySelector('.install-guide');
  if (guide) guide.outerHTML = `<div class="settings-section"><div class="section-header"><h3>${runtime.standalone ? '已在主屏幕中打开' : '把日序添加到 iPhone 主屏幕'}</h3><span class="tag life">v${APP_VERSION}</span></div><p>从桌面图标打开，像 App 一样记录。首次添加后，请先联网打开一次。</p><button class="button secondary install-settings-button" data-action="install-guide">${icon('phone')} ${runtime.standalone ? '查看使用与迁移指引' : '查看 Safari 安装步骤'}</button><div class="pwa-status-list" id="pwa-settings-status"></div><div class="backup-actions"><button class="button secondary" data-action="protect-data">${icon('leaf')} 保护本机记录</button><button class="button secondary" id="update-app-button" data-action="update-app" hidden>更新并重新打开</button></div></div>`;
  const version = modal.querySelector('.settings-bottom span'); if (version) version.textContent = `DAYLINE ${APP_VERSION}`;
  refreshRuntimeUI();
}
function cacheLabel() { return runtime.cacheReady ? '离线资源已就绪' : runtime.cacheError ? '离线资源未准备好，请联网重新打开' : '正在准备离线资源…'; }
function refreshRuntimeUI() {
  document.documentElement.dataset.standalone=String(runtime.standalone);
  const root = document.querySelector('#runtime-ui');
  if (root) root.innerHTML = `${!runtime.online ? '<div class="network-note" role="status">'+icon('leaf')+'<span>当前离线 · 记录仍保存在本机。'+(runtime.cacheReady?'':'首次联网后，才能准备离线资源。')+'</span></div>' : ''}${runtime.updateReady ? '<div class="update-note"><span>日序有新版本，保存内容后可更新。</span><button class="text-button" data-action="settings">查看更新 '+icon('arrow')+'</button></div>' : ''}${activeTab==='today' && !runtime.standalone && !installHintDismissed ? '<section class="install-nudge"><span class="install-nudge-icon">'+icon('phone')+'</span><div><h2>把日序，放到 iPhone 主屏幕</h2><p>从桌面图标打开。免安装包，也无需 Apple 开发者会员。</p></div><button class="button secondary" data-action="install-guide">'+(runtime.appleMobile?'查看步骤':'在 iPhone 上使用')+'</button><button class="icon-button" data-action="dismiss-install" aria-label="暂时收起安装提示">'+icon('close')+'</button></section>' : ''}`;
  const status = document.querySelector('#pwa-settings-status');
  if (status) status.innerHTML = `<p><i class="${runtime.cacheReady?'ready':'pending'}"></i>${cacheLabel()}</p><p><i class="${runtime.persistent?'ready':'pending'}"></i>${runtime.persistent ? '浏览器已授予本机存储保护' : '仍建议定期导出备份'}</p><small>存储保护可减少浏览器自动清理，不等于云端备份。</small>`;
  const updateButton = document.querySelector('#update-app-button');if(updateButton)updateButton.hidden=!runtime.updateReady;
  const installStatus = document.querySelector('#install-cache-status');if(installStatus)installStatus.textContent=cacheLabel();
}
function installModal() {
  if (modal.open) modal.close();
  const hasRecords=state.tasks.length||state.entries.length||Object.values(state.reflections).some(r=>r.mood||r.win||r.improve||r.tomorrow);
  openModal(`${modalHeader('YOUR DAYS, WITHIN REACH',runtime.standalone?'已经在主屏幕中打开':'在 iPhone 上，像 App 一样使用')}<div class="install-app-heading"><img src="${appAsset("icon-192.png")}" alt="日序图标"><div><h3>日序 <small>DAYLINE</small></h3><p>每日计划 · 生活记录 · 每周复盘</p></div></div>${runtime.standalone?'<div class="install-success">'+icon('check')+' 以后从桌面的「日序」图标打开即可。</div>':'<ol class="install-steps"><li><span>1</span><div><b>用 iPhone 的 Safari 打开日序</b><p>这个版本不需要账号登录，第一次请保持联网打开。</p></div></li><li><span>2</span><div><b>点 Safari 的「分享」按钮</b><p>部分布局需要先点页面菜单，再选「分享」。</p></div></li><li><span>3</span><div><b>选择「添加到主屏幕」</b><p>如果出现「作为网页 App 打开」，请开启，再点「添加」。</p></div></li><li><span>4</span><div><b>从新图标联网打开一次</b><p>等待离线资源准备完成，再开始正式记录。</p></div></li></ol>'}<div class="install-transfer"><h3>${hasRecords?'已有记录？先备份，再迁移。':'建议先添加，再开始记录。'}</h3><p>Safari 和主屏幕 App 的本机记录可能分开保存。如果添加后记录为空，请回到原来的 Safari 页面导出备份，再从日序图标打开，在「设置与备份」导入。</p>${hasRecords?'<button class="button secondary" data-action="export">'+icon('download')+' 先导出当前记录</button>':''}</div><label class="install-url-label" for="install-url">在 iPhone Safari 中打开的网址</label><div class="install-url"><input id="install-url" readonly value="${escape(new URL('./', import.meta.url).href)}" aria-label="日序使用网址"><button class="button secondary" data-action="copy-app-url">复制</button></div><div class="install-cache-label" id="install-cache-status">${cacheLabel()}</div><p class="install-footnote">记录目前保存在这台设备；云同步尚未接入。请在常用设备中保留备份。</p>`);
}
function refreshCalendarAfterResume() {
  const today = dateKey();
  if (today===knownToday || modal.open || document.activeElement?.closest('form') || document.querySelector('#quick-text')?.value.trim()) return;
  const yesterday = knownToday;knownToday=today;
  if (selectedDate===yesterday) selectedDate=today;
  if (reviewStart===weekStart(yesterday)) reviewStart=weekStart(today);
  render();
}
function exportJSON(data, filename) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function navigate(tab) { activeTab=tab; render(); window.scrollTo({top:0,behavior:'smooth'}); }
function deleteItem(type,itemID) {
  const list=type==='task'?'tasks':'entries', item=state[list].find(t=>t.id===itemID);
  if(!item)return;
  const index=state[list].indexOf(item); state[list].splice(index,1);const saved=save();modal.close();render();
  toast(saved ? (type==='task'?'计划已删除':'记录已删除') : '删除仅暂存在本页，请导出备份。',()=>{let restored=true;if(!state[list].some(t=>t.id===item.id)){state[list].splice(index,0,item);restored=save();render();}savedToast(restored,'已恢复');});
}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]'); if(!b)return;
  const action=b.dataset.action;
  if(b.tagName==='A')event.preventDefault();
  switch(action){
    case 'nav':navigate(b.dataset.tab);break;
    case 'new-task':taskModal(null,b.dataset.priority);break;
    case 'edit-task':taskModal(b.dataset.id);break;
    case 'new-entry':entryModal();break;
    case 'edit-entry':entryModal(b.dataset.id);break;
    case 'close-modal':modal.close();break;
    case 'settings':settingsModal();break;
    case 'install-guide':installModal();break;
    case 'dismiss-install':installHintDismissed=true;try{localStorage.setItem('dayline.install-hint-dismissed','1');}catch{}refreshRuntimeUI();break;
    case 'copy-app-url':{if(!navigator.clipboard){toast('请长按上方网址复制。');break;}navigator.clipboard.writeText(new URL('./', import.meta.url).href).then(()=>toast('网址已复制，请在 iPhone Safari 打开。')).catch(()=>toast('请长按上方网址复制。'));break;}
    case 'protect-data':protectLocalData().then(value=>{pwaController?.setPersistent(value);toast(value?'已开启本机存储保护，仍请定期备份。':value===null?'此浏览器暂不支持，仍可正常记录并导出备份。':'浏览器暂未授予，请定期导出备份。');}).catch(()=>toast('暂时无法申请，请定期导出备份。'));break;
    case 'update-app':{const draft=document.querySelector('#quick-text')?.value.trim();if(draft){toast('请先保存「此刻，记一笔」中的内容，再更新。');break;}if(!pwaController?.applyUpdate())toast('当前已是最新版本。');break;}
    case 'toggle-task':{const t=state.tasks.find(t=>t.id===b.dataset.id);if(!t)break;t.completed=!t.completed;t.completedAt=t.completed?new Date().toISOString():'';const saved=save();render();if(t.completed||!saved)savedToast(saved,'又完成了一件事，做得不错。');break;}
    case 'delete-task':deleteItem('task',b.dataset.id);break;
    case 'delete-entry':deleteItem('entry',b.dataset.id);break;
    case 'prev-day':selectedDate=shiftDate(selectedDate,-1);render();break;
    case 'next-day':selectedDate=shiftDate(selectedDate,1);render();break;
    case 'back-today':selectedDate=dateKey();render();break;
    case 'select-date':selectedDate=b.dataset.date;planFilter='today';render();break;
    case 'plan-filter':planFilter=b.dataset.filter;render();break;
    case 'view-day':selectedDate=b.dataset.date;navigate('journal');break;
    case 'reflect':navigate('journal');document.querySelector('#reflection-panel')?.scrollIntoView({behavior:'smooth',block:'start'});break;
    case 'mood':{const r=state.reflections[selectedDate]||{};r.mood=r.mood===Number(b.dataset.value)?0:Number(b.dataset.value);r.updatedAt=new Date().toISOString();state.reflections[selectedDate]=r;const saved=save();render();if(!saved)savedToast(false,'');break;}
    case 'prev-week':reviewStart=shiftDate(reviewStart,-7);render();break;
    case 'next-week':reviewStart=shiftDate(reviewStart,7);render();break;
    case 'export':exportJSON(createBackup(state),`日序备份-${dateKey()}.json`);toast('备份文件已准备好，请保存。');break;
    case 'export-raw':{let raw;try{raw=localStorage.getItem(STORAGE_KEY);}catch{}exportJSON({raw},`日序原始数据-${dateKey()}.json`);break;}
    case 'import':document.querySelector('#import-file').click();break;
    case 'undo':{const fn=undoAction;undoAction=undefined;fn?.();break;}
    case 'confirm-import':{if(!pendingImport)break;const old=state;state=pendingImport;try{lastStoredRaw=localStorage.getItem(STORAGE_KEY);storageProblem=false;storageConflict=false;}catch{storageProblem=true;}const saved=save();if(!saved){state=old;toast('存储不可用，未替换现有记录。');break;}pendingImport=null;modal.close();render();toast('备份已导入');break;}
  }
});
document.addEventListener('submit',event=>{
  const form=event.target; if(!['task-form','entry-form','quick-entry','settings-form'].includes(form.id))return;
  event.preventDefault(); const data=Object.fromEntries(new FormData(form));
  if(form.id==='task-form'){
    const old=state.tasks.find(t=>t.id===form.dataset.id);
    if(!data.title.trim()){toast('写下一个想完成的计划吧。');return;}
    if(data.priority && state.tasks.filter(t=>t.date===data.date&&t.priority==='high'&&t.id!==old?.id).length>=3){toast('当天已有 3 个重点，可以先完成一个或调整重点。');return;}
    const task={id:old?.id||id(),title:data.title.trim(),date:data.date,time:data.time,category:data.category,minutes:Number(data.minutes),priority:data.priority?'high':'normal',completed:old?.completed||false,completedAt:old?.completedAt||'',createdAt:old?.createdAt||new Date().toISOString()};
    if(old)state.tasks[state.tasks.indexOf(old)]=task;else state.tasks.push(task);
    const saved=save();modal.close();render();savedToast(saved,old?'计划已更新':'计划已安排，慢慢来。');
  } else if(form.id==='entry-form'||form.id==='quick-entry'){
    if(!data.text.trim()){toast('先写下一点内容吧。');return;}
    const old=state.entries.find(t=>t.id===form.dataset.id);
    const entry={id:old?.id||id(),text:data.text.trim(),date:data.date||selectedDate,time:data.time||timeNow(),category:data.category,minutes:Number(data.minutes),createdAt:old?.createdAt||new Date().toISOString()};
    if(old)state.entries[state.entries.indexOf(old)]=entry;else state.entries.push(entry);
    entryCategory=data.category;const saved=save();if(modal.open)modal.close();render();savedToast(saved,old?'记录已更新':'这个片刻，已经好好记下。');
  } else if(form.id==='settings-form'){
    state.settings.name=data.name.trim();const saved=save();modal.close();render();savedToast(saved,'很高兴认识你'+(state.settings.name?'，'+state.settings.name:'')+'。');
  }
});
document.addEventListener('change',event=>{
  if(event.target.id==='selected-date'&&event.target.value){selectedDate=event.target.value;render();}
  if(event.target.id==='show-completed'){showCompleted=event.target.checked;render();}
});
document.addEventListener('input',event=>{
  if(event.target.id==='task-search'){
    const pos=event.target.selectionStart;searchQuery=event.target.value;render();const input=document.querySelector('#task-search');input.focus();try{input.setSelectionRange(pos,pos);}catch{}
  }
  if(event.target.closest('#reflection-form')){
    const r=state.reflections[selectedDate]||{};r[event.target.name]=event.target.value;r.updatedAt=new Date().toISOString();state.reflections[selectedDate]=r;
    const saved=save(), el=document.querySelector('#reflection-status'); if(el)el.textContent=saved?'已保存':'保存失败，请导出';
  }
});
modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
let pendingImport=null;
document.querySelector('#import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{
    if(file.size>20*1024*1024)throw new Error('备份文件过大，最多支持 20MB。');
    pendingImport=readBackup(JSON.parse(await file.text()));
    if(modal.open)modal.close();
    openModal(`${modalHeader('RESTORE YOUR DAYS','恢复备份记录')}<p class="import-copy">这份备份包含 <b>${pendingImport.tasks.length}</b> 个计划、<b>${pendingImport.entries.length}</b> 条记录和 <b>${Object.keys(pendingImport.reflections).length}</b> 天复盘。导入后将替换本机当前数据。</p><p class="muted">如果希望保留当前记录，请先取消并导出一份备份。</p><div class="modal-footer"><button class="button secondary" data-action="close-modal">取消</button><button class="button primary" data-action="confirm-import">确认替换并导入</button></div>`);
  }catch(error){pendingImport=null;toast(error instanceof SyntaxError?'文件无法读取，请选择日序导出的 JSON 备份。':error.message);}
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){try{const next=event.newValue?normalizeState(JSON.parse(event.newValue)):newState();if(modal.open||document.activeElement?.closest('form')){storageConflict=true;toast('另一页面更新了记录。请先导出本页记录，再刷新。');return;}state=next;lastStoredRaw=event.newValue;storageConflict=false;render();}catch{storageConflict=true;}}});
render();
pwaController = startPWA(status => { runtime=status;refreshRuntimeUI(); });
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshCalendarAfterResume();});
window.addEventListener('pageshow',refreshCalendarAfterResume);
document.addEventListener('focusout',()=>{setTimeout(refreshCalendarAfterResume,0);});
modal.addEventListener('close',refreshCalendarAfterResume);
