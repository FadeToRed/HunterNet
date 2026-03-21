var hn_bin_cred = '69bde0e0aa77b81da903b007';
var hn_bin_prof = '69bdbcf2aa77b81da9034979';
var hn_bin_post = '69bdbd03c3097a1dd5442d93';
var hn_api      = 'https://api.jsonbin.io/v3/b';
var hn_bin_notif = '69bea1c4c3097a1dd546df4f';
var hn_tags     = ['#notizie'];
var hn_colors   = ['#c0392b','#e67e22','#f39c12','#27ae60','#16a085','#2980b9','#8e44ad','#2c3e50','#d35400','#1abc9c'];

var hn_user     = null;
var hn_notifs   = [];
var hn_creds    = [];
var hn_profiles = [];
var hn_posts    = [];
var hn_tab_cur   = 'all';
var hn_filter_user_id = null;
var hn_sel_color = hn_colors[5];

/* ── HELPERS ── */
function hnHashPw(pw) { return pw; }

function hnKey() {
  if (window.HxHFramework && window.HxHFramework.constants && window.HxHFramework.constants.JSONBIN_MASTER_KEY)
    return window.HxHFramework.constants.JSONBIN_MASTER_KEY;
  return null;
}
function hnShowErr(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function hnHideErr(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function hnMkH() {
  var h = { 'Content-Type': 'application/json' };
  var k = hnKey();
  if (k) h['X-Master-Key'] = k;
  return h;
}
function hnGET(url, ok, fail) {
  fetch(url, { headers: hnMkH() })
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(ok).catch(fail || function(){});
}
function hnPUT(url, data, ok, fail) {
  fetch(url, { method:'PUT', headers:hnMkH(), body:JSON.stringify(data) })
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(ok).catch(fail || function(){});
}
function hnVerifiedBadge(prof) {
  if (!prof || !prof.verified) return '';
  return '<span class="mdi mdi-check-decagram" style="color:#5b9cf6!important;font-size:14px!important;vertical-align:middle!important;" title="Utente verificato"></span>';
}

function hnInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/); var r = '';
  for (var i = 0; i < parts.length; i++) if (parts[i]) r += parts[i].charAt(0).toUpperCase();
  return r.slice(0,2);
}
function hnEsc(s) {
  if (!s) return '';
  var amp = '\u0026amp;', lt = '\u0026lt;', gt = '\u0026gt;', qt = '\u0026quot;';
  return s.split('\u0026').join(amp).split('<').join(lt).split('>').join(gt).split('"').join(qt);
}
function hnAgo(iso) {
  var diff = Date.now() - new Date(iso).getTime();
  var m = Math.floor(diff/60000);
  if (m < 1) return 'adesso'; if (m < 60) return m+'m';
  var h = Math.floor(m/60); if (h < 24) return h+'h';
  return Math.floor(h/24)+'g';
}
function hnRankClass(rank) {
  if (!rank) return 'hn-rdef';
  if (rank.indexOf('\u2605\u2605\u2605') !== -1) return 'hn-r1';
  if (rank.indexOf('\u2605\u2605') !== -1) return 'hn-r2';
  if (rank.indexOf('\u2605') !== -1) return 'hn-r3';
  if (rank === 'Apprendista') return 'hn-rapp';
  if (rank === 'Lottatore Celeste') return 'hn-rlc';
  if (rank.indexOf('Hunter') !== -1) return 'hn-rpro';
  return 'hn-rdef';
}
function hnAvHtml(color, avatarUrl, name, cls, size) {
  var st = 'background:' + (color||'#888') + ';';
  if (size) st += 'width:' + size + 'px;height:' + size + 'px;';
  if (avatarUrl) {
    return '<div class="' + cls + '" style="' + st + '"><img src="' + hnEsc(avatarUrl) + '" alt="" onerror="this.style.display=\'none\'"></div>';
  }
  return '<div class="' + cls + '" style="' + st + '">' + hnInitials(name) + '</div>';
}

/* ── INIT ── */
function hnInit() {
  hnBuildHashtags();
  hnBuildColorPicker();
  document.getElementById('hn-mention-drop').style['display'] = 'none';
  document.getElementById('hn-tooltip').style['display'] = 'none';
  document.getElementById('hn-notif-drop').style['display'] = 'none';
  document.getElementById('hn-bell-badge').style['display'] = 'none';
  document.getElementById('hn-bar').style['z-index'] = '99';
  document.getElementById('hn-layout').style['margin'] = '0';
  document.getElementById('hn-layout').style['padding'] = '0';
  document.getElementById('hn-bar').style['display'] = 'flex';
  document.getElementById('hn-bar').style['justify-content'] = 'space-between';
  document.getElementById('hn-bar').style['text-align'] = 'left';
  document.getElementById('hn-lbanner').style['display'] = 'flex';
  document.getElementById('hn-lbanner').style['justify-content'] = 'space-between';
  document.getElementById('hn-lbanner').style['text-align'] = 'left';
  var mids = ['hn-modal-auth','hn-modal-reg','hn-modal-prof','hn-modal-share'];
  for (var i = 0; i < mids.length; i++) {
    var m = document.getElementById(mids[i]);
    if (m) m.style['z-index'] = '99999';
  }
  document.getElementById('hn-lightbox').style['z-index'] = '99999';
  var n = 0; var hasErr = false;
  function tryDone() {
    n++;
    if (n < 4) return;
    if (hasErr) { document.getElementById('hn-posts').innerHTML = '<div class="hn-msg">Errore nel caricare il feed. Riprova.</div>'; return; }
    hnRenderFeed(); hnRenderSidebar(); hnRestoreSession(); hnBuildHashtags();
  }
  hnGET(hn_api+'/'+hn_bin_cred+'/latest',
    function(d){ hn_creds = (d&&d.record&&d.record.credentials) ? d.record.credentials : []; tryDone(); },
    function(){ hasErr=true; tryDone(); }
  );
  hnGET(hn_api+'/'+hn_bin_prof+'/latest',
    function(d){ hn_profiles = (d&&d.record&&d.record.profiles) ? d.record.profiles : []; tryDone(); },
    function(){ hasErr=true; tryDone(); }
  );
  hnGET(hn_api+'/'+hn_bin_post+'/latest',
    function(d){ hn_posts = (d&&d.record&&d.record.posts) ? d.record.posts : []; tryDone(); },
    function(){ hasErr=true; tryDone(); }
  );
  hnGET(hn_api+'/'+hn_bin_notif+'/latest',
    function(d){ hn_notifs = (d&&d.record&&d.record.notifications) ? d.record.notifications : []; tryDone(); },
    function(){ hn_notifs=[]; tryDone(); }
  );
}

function hnRestoreSession() {
  var s = sessionStorage.getItem('hn_user');
  if (!s) return;
  try { hn_user = JSON.parse(s); hnSetLoggedIn(); hnRenderFeed(); hnUpdateBadge(); } catch(e) {}
}

/* ── PASSWORD TOGGLE ── */
function hnTogglePw(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  var isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  var ico = btn.querySelector('svg');
  if (ico) {
    if (isHidden) {
      ico.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
      ico.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  }
}

/* ── AUTH ── */
function hnDoLogin() {
  hnHideErr('hn-lerr');
  var handle = document.getElementById('hn-lhandle').value.trim().toLowerCase().replace('@','');
  var pass   = document.getElementById('hn-lpass').value;
  if (!handle || !pass) return hnShowErr('hn-lerr','Compila tutti i campi.');
  var cred = null;
  for (var i = 0; i < hn_creds.length; i++) {
    if (hn_creds[i].handle.toLowerCase() === handle) { cred = hn_creds[i]; break; }
  }
  if (!cred) return hnShowErr('hn-lerr','Nickname non trovato.');
  if (cred.password !== hnHashPw(pass)) return hnShowErr('hn-lerr','Codice non corretto.');
  var prof = null;
  for (var j = 0; j < hn_profiles.length; j++) {
    if (hn_profiles[j].id === cred.id) { prof = hn_profiles[j]; break; }
  }
  if (!prof) return hnShowErr('hn-lerr','Profilo non trovato. Contatta un admin.');
  hn_user = prof;
  sessionStorage.setItem('hn_user', JSON.stringify(hn_user));
  hnCloseModal('auth');
  hnSetLoggedIn();
  hnRenderFeed();
}

function hnDoRegister() {
  hnHideErr('hn-rerr');
  var name   = document.getElementById('hn-rname').value.trim();
  var handle = document.getElementById('hn-rhandle').value.trim().replace('@','');
  var rank   = document.getElementById('hn-rrank').value;
  var bio    = document.getElementById('hn-rbio').value.trim();
  var avatar = document.getElementById('hn-ravatar').value.trim();
  var pass   = document.getElementById('hn-rpass').value;
  if (!name || !handle || !rank || !pass) return hnShowErr('hn-rerr','Compila tutti i campi obbligatori.');
  if (handle.length < 3) return hnShowErr('hn-rerr','Nickname troppo corto (min 3 caratteri).');
  var hn_ok = true;
  for (var ci = 0; ci < handle.length; ci++) {
    var ch = handle.charCodeAt(ci);
    var isLower = ch >= 97 && ch <= 122;
    var isUpper = ch >= 65 && ch <= 90;
    var isDigit = ch >= 48 && ch <= 57;
    var isUnder = ch === 95;
    if (!isLower && !isUpper && !isDigit && !isUnder) { hn_ok = false; break; }
  }
  if (!hn_ok) return hnShowErr('hn-rerr','Nickname: solo lettere, numeri e _.');
  for (var i = 0; i < hn_creds.length; i++) {
    if (hn_creds[i].handle.toLowerCase() === handle.toLowerCase()) return hnShowErr('hn-rerr','Nickname già in uso.');
  }
  if (pass.length < 4) return hnShowErr('hn-rerr','Il codice deve essere di almeno 4 caratteri.');

  var id = String(Date.now());
  var pwHash = hnHashPw(pass);

  var newCred = { id:id, handle:handle, password:pwHash };
  var newProf = { id:id, name:name, handle:handle, rank:rank, bio:bio,
    color:hn_sel_color, avatar:avatar||'', createdAt:new Date().toISOString() };

  hn_creds.push(newCred);
  hn_profiles.push(newProf);

  var saved = 0; var errored = false;
  function onSaved() {
    saved++;
    if (saved < 2) return;
    if (errored) {
      hn_creds.pop(); hn_profiles.pop();
      hnShowErr('hn-rerr','Errore durante la registrazione. Riprova.');
      return;
    }
    hn_user = newProf;
    sessionStorage.setItem('hn_user', JSON.stringify(hn_user));
    hnCloseModal('reg'); hnSetLoggedIn(); hnRenderSidebar();
  }
  function onErr() { errored=true; onSaved(); }

  hnPUT(hn_api+'/'+hn_bin_cred, {credentials:hn_creds}, onSaved, onErr);
  hnPUT(hn_api+'/'+hn_bin_prof, {profiles:hn_profiles}, onSaved, onErr);
}

function hnSetLoggedIn() {
  document.getElementById('hn-lbanner').style['display'] = 'none';
  document.getElementById('hn-compose').classList.add('hn-vis');
  hnBellShow();
  var followTab = document.getElementById('hn-tab-following');
  if (followTab) followTab.style['display'] = 'inline-block';
  var av = document.getElementById('hn-cav');
  av.style.background = hn_user.color || '#888';
  if (hn_user.avatar) {
    av.innerHTML = '<img src="' + hnEsc(hn_user.avatar) + '" alt="" onerror="this.style.display=\'none\'">';
  } else {
    av.textContent = hnInitials(hn_user.name);
  }
  var br = document.getElementById('hn-bar-right');
  var avHtml = hnAvHtml(hn_user.color, hn_user.avatar, hn_user.name, 'hn-miniav', null);
  br.innerHTML = '<div id="hn-upill" onclick="hnOpenProfile(\'' + hn_user.id + '\')">' +
    avHtml + '<span class="hn-pillname">@' + hn_user.handle + '</span></div>' +
    '<button class="hn-gbtn" onclick="hnLogout()">Esci</button>';
}

function hnLogout() {
  hn_user = null;
  sessionStorage.removeItem('hn_user');
  document.getElementById('hn-lbanner').style['display'] = 'flex';
  document.getElementById('hn-compose').classList.remove('hn-vis');
  document.getElementById('hn-bar-right').innerHTML =
    '<button class="hn-gbtn" onclick="hnOpenModal(\'auth\')">Accedi</button>' +
    '<button class="hn-dbtn" onclick="hnOpenModal(\'reg\')">Registrati</button>';
  hnBellHide();
  var followTab = document.getElementById('hn-tab-following');
  if (followTab) followTab.style['display'] = 'none';
  if (hn_tab_cur === 'following') { hn_tab_cur = 'all'; hnRenderFeed(); }
}

/* ── AVATAR PREVIEW ── */
function hnPreviewAvatar() {
  var url = document.getElementById('hn-ravatar').value.trim();
  var prev = document.getElementById('hn-av-preview');
  prev.style.background = hn_sel_color;
  if (url) {
    prev.innerHTML = '<img src="'+hnEsc(url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentNode.innerHTML=\'?\'">';
  } else {
    prev.innerHTML = hnInitials(document.getElementById('hn-rname').value) || '?';
  }
}

/* ── COMPOSE ── */
function hnFormatText(text) {
  if (!text) return '';
  var t = text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
  t = hnBBReplace(t, 'b', 'hn-fmt-b');
  t = hnBBReplace(t, 'i', 'hn-fmt-i');
  t = hnBBReplace(t, 'u', 'hn-fmt-u');
  t = hnBBReplace(t, 'bar', 'hn-fmt-s');
  t = t.replace(/(#[a-zA-Z0-9_]+)/g,'<span class="hn-hi">$1</span>');
  t = t.replace(/@([a-zA-Z0-9_]+)/g, function(match, handle) {
    for (var i = 0; i < hn_profiles.length; i++) {
      if (hn_profiles[i].handle.toLowerCase() === handle.toLowerCase())
        return '<span class="hn-mention" onclick="hnOpenProfileByHandle(\'' + handle + '\')">@' + handle + '</span>';
    }
    return match;
  });
  return t;
}

function hnBBReplace(t, tag, cls) {
  var open = '[' + tag + ']';
  var close = '[/' + tag + ']';
  var result = '';
  var pos = 0;
  while (pos < t.length) {
    var start = t.indexOf(open, pos);
    if (start === -1) { result += t.substring(pos); break; }
    var end = t.indexOf(close, start + open.length);
    if (end === -1) { result += t.substring(pos); break; }
    result += t.substring(pos, start);
    result += '<span class="' + cls + '">' + t.substring(start + open.length, end) + '</span>';
    pos = end + close.length;
  }
  return result;
}

function hnApplyFormat(fmt) {
  var ta = document.getElementById('hn-textarea');
  if (!ta) return;
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  var sel = ta.value.substring(start, end);
  var before = ta.value.substring(0, start);
  var after = ta.value.substring(end);
  var open_tag = fmt === 's' ? '[bar]' : '[' + fmt + ']';
  var close_tag = fmt === 's' ? '[/bar]' : '[/' + fmt + ']';
  ta.value = before + open_tag + sel + close_tag + after;
  if (sel) {
    ta.setSelectionRange(start + open_tag.length, start + open_tag.length + sel.length);
  } else {
    var cursor = start + open_tag.length;
    ta.setSelectionRange(cursor, cursor);
  }
  ta.focus();
  hnUpdateChar();
}

function hnBuildHashtags() {
  var counts = {};
  for (var i = 0; i < hn_posts.length; i++) {
    var tags = hn_posts[i].text.match(/#[a-zA-Z0-9_]+/g) || [];
    for (var j = 0; j < tags.length; j++) {
      var t = tags[j].toLowerCase();
      if (t !== '#notizie') counts[t] = (counts[t] || 0) + 1;
    }
  }
  var sorted = [];
  for (var k in counts) sorted.push([k, counts[k]]);
  sorted.sort(function(a,b){ return b[1]-a[1]; });
  var dynamic = [];
  for (var d = 0; d < sorted.length && dynamic.length < 9; d++) dynamic.push(sorted[d][0]);
  var allTags = ['#notizie'].concat(dynamic);
  var html = '';
  for (var ti = 0; ti < allTags.length; ti++)
    html += '<button class="hn-htag" onclick="hnInsertTag(\''+allTags[ti]+'\')">'+allTags[ti]+'</button>';
  document.getElementById('hn-hrow').innerHTML = html;
}
function hnInsertTag(tag) {
  var ta = document.getElementById('hn-textarea');
  var v = ta.value;
  ta.value = v + (v && v.charAt(v.length-1) !== ' ' ? ' ' : '') + tag + ' ';
  ta.focus(); hnUpdateChar();
}
function hnUpdateChar() {
  var ta = document.getElementById('hn-textarea');
  var rem = 280 - ta.value.length;
  var cc = document.getElementById('hn-chars');
  cc.textContent = rem;
  cc.className = rem < 20 ? 'hn-warn' : '';
  document.getElementById('hn-postbtn').disabled = ta.value.trim().length === 0;
}
function hnToggleImgRow() {
  var row = document.getElementById('hn-imgurl-row');
  if (row.classList.contains('hn-vis')) { row.classList.remove('hn-vis'); document.getElementById('hn-imgurl').value=''; }
  else row.classList.add('hn-vis');
}
function hnClearImg() {
  document.getElementById('hn-imgurl').value = '';
  document.getElementById('hn-imgurl-row').classList.remove('hn-vis');
}

function hnSubmitPost() {
  if (!hn_user) return;
  var ta   = document.getElementById('hn-textarea');
  var text = ta.value.trim();
  if (!text) return;
  var imgUrl = document.getElementById('hn-imgurl').value.trim();
  var btn = document.getElementById('hn-postbtn');
  btn.disabled = true; btn.textContent = '...';
  var post = { id:String(Date.now()), authorId:hn_user.id, authorName:hn_user.name,
    authorHandle:hn_user.handle, authorColor:hn_user.color, authorAvatar:hn_user.avatar||'',
    authorRank:hn_user.rank, text:text, imgUrl:imgUrl||'',
    likes:[], comments:[], createdAt:new Date().toISOString() };
  hn_posts.unshift(post);
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts},
    function(){ ta.value=''; hnClearImg(); hnUpdateChar(); hnRenderFeed(); hnRenderSidebar(); btn.disabled=false; btn.textContent='Pubblica'; },
    function(){ hn_posts.shift(); alert('Errore durante la pubblicazione.'); btn.disabled=false; btn.textContent='Pubblica'; }
  );
}

/* ── FEED ── */
function hnTab(tab, el) {
  hn_tab_cur = tab;
  hn_filter_user_id = null;
  var tabs = document.querySelectorAll('.hn-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('hn-active');
  el.classList.add('hn-active');
  var userTab = document.getElementById('hn-tab-user');
  if (userTab) userTab.style['display'] = 'none';
  hnRenderFeed();
}
function hnFiltered() {
  var out = [];
  var following = [];
  if (hn_tab_cur === 'following' && hn_user) {
    var my_prof = null;
    for (var f = 0; f < hn_profiles.length; f++) { if (hn_profiles[f].id === hn_user.id) { my_prof = hn_profiles[f]; break; } }
    following = (my_prof && my_prof.following) ? my_prof.following : [];
  }
  for (var i = 0; i < hn_posts.length; i++) {
    var p = hn_posts[i];
    if (hn_tab_cur === 'hunters' && (!p.authorRank || p.authorRank.indexOf('Hunter') === -1)) continue;
    if (hn_tab_cur === 'news' && p.text.indexOf('#notizie') === -1) continue;
    if (hn_tab_cur === 'following') {
      var inFollowing = false;
      for (var fi = 0; fi < following.length; fi++) { if (following[fi] === p.authorId) { inFollowing = true; break; } }
      if (!inFollowing) continue;
    }
    if (hn_tab_cur === 'user' && hn_filter_user_id && p.authorId !== hn_filter_user_id) continue;
    out.push(p);
  }
  return out;
}
function hnFilterUser(aid, name) {
  hn_tab_cur = 'user';
  hn_filter_user_id = aid;
  var tabs = document.querySelectorAll('.hn-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('hn-active');
  var userTab = document.getElementById('hn-tab-user');
  if (!userTab) {
    userTab = document.createElement('button');
    userTab.id = 'hn-tab-user';
    userTab.className = 'hn-tab hn-active';
    userTab.onclick = function() { hnTab('all', document.querySelector('.hn-tab')); };
    document.querySelector('.hn-tabs').appendChild(userTab);
  }
  userTab.textContent = name + ' \u00d7';
  userTab.className = 'hn-tab hn-active';
  userTab.style['display'] = 'inline-block';
  hnRenderFeed();
  document.getElementById('hn-posts').scrollTop = 0;
}
function hnRenderFeed() {
  var list = document.getElementById('hn-posts');
  var fp = hnFiltered();
  if (!fp.length) { list.innerHTML='<div class="hn-msg">Nessun post ancora. Sii il primo a scrivere!</div>'; return; }
  var html='';
  for (var i=0;i<fp.length;i++) html+=hnRenderPost(fp[i]);
  list.innerHTML=html;
  hnAttachMentionListeners();
}

function hnAttachMentionListeners() {
  var inputs = document.getElementById('hn-posts').querySelectorAll('input[type=text]');
  for (var i = 0; i < inputs.length; i++) {
  }
}
function hnRenderPost(p) {
  var lc = p.likes ? p.likes.length : 0;
  var cc = p.comments ? p.comments.length : 0;
  var liked = false;
  if (hn_user&&p.likes) { for (var i=0;i<p.likes.length;i++) { if(p.likes[i]===hn_user.id){liked=true;break;} } }
  var th = hnFormatText(p.text);
  th = th.split('\n').join('<br>');
  var imgHtml = p.imgUrl ? '<img class="hn-pimg" src="'+hnEsc(p.imgUrl)+'" alt="" onclick="hnOpenLightbox(this.src)" onerror="this.style.display=\'none\'">' : '';
  var sharedHtml = '';
  if (p.sharedPost) {
    var sp = p.sharedPost;
    var sth = sp.text ? sp.text.replace(/(#\w+)/g,'<span class="hn-hi">$1</span>') : '';
    sharedHtml = '<div class="hn-shared-preview">'+
      '<div class="hn-shared-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> Condiviso da '+hnEsc(sp.authorName)+'</div>'+
      '<div class="hn-shared-author">'+hnEsc(sp.authorName)+' <span style="color:#5b6577!important;">@'+hnEsc(sp.authorHandle)+'</span></div>'+
      '<div class="hn-shared-text">'+sth+'</div>'+
      (sp.imgUrl?'<img src="'+hnEsc(sp.imgUrl)+'" style="max-width:100%;max-height:150px;border-radius:6px;margin-top:6px;object-fit:cover;display:block;" onerror="this.style.display=\'none\'">':'')+
      '</div>';
  }
  var cl = p.comments||[];
  var commHtml = hnRenderComments(cl, 3, p.id);
  var cf = hn_user ? '<div class="hn-ccompose"><input type="text" placeholder="Rispondi..." id="hn-ci-'+p.id+'" oninput="hnMentionCheck(this);" onkeydown="hnMentionKey(event,this);if(event.key===\'Enter\')hnSubmitComment(\''+p.id+'\')" onblur="setTimeout(hnMentionHide,150);"><button class="hn-csend" onclick="hnSubmitComment(\''+p.id+'\')">Invia</button></div>' : '';
  var shareBtn = hn_user ? '<button class="hn-abtn" onclick="hnOpenShare(\''+p.id+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'+(p.shares||0)+'</button>' : '';
  var isOwner = hn_user && hn_user.id === p.authorId;
  var ownerActions = isOwner ?
    '<div class="hn-owner-actions">'+
    '<button class="hn-edit-btn" onclick="hnEditPost(\''+p.id+'\')">Modifica</button>'+
    '<button class="hn-del-btn" onclick="hnDeletePost(\''+p.id+'\')">Elimina</button>'+
    '</div>' : '';
  var editedLabel = p.edited ? '<span class="hn-edited">· modificato</span>' : '';
  return '<div class="hn-post" id="hn-p-'+p.id+'"><div class="hn-phead">'+
    hnAvHtml(p.authorColor,p.authorAvatar||'',p.authorName,'hn-av',null)+
    '<div class="hn-pbody"><div class="hn-pmeta">'+
    '<span class="hn-pname" onclick="hnOpenProfile(\''+p.authorId+'\')">'+hnEsc(p.authorName)+'</span>'+hnVerifiedBadge(hnProfileById(p.authorId))+
    '<span class="hn-phandle">@'+hnEsc(p.authorHandle)+'</span>'+
    '<span class="hn-rank '+hnRankClass(p.authorRank)+'">'+hnEsc(p.authorRank||'')+'</span>'+
    '<span class="hn-ptime">'+hnAgo(p.createdAt)+'</span>'+editedLabel+ownerActions+'</div>'+
    '<div class="hn-ptext" id="hn-pt-'+p.id+'">'+th+'</div>'+imgHtml+sharedHtml+
    '<div class="hn-pactions">'+
    '<button class="'+(liked?'hn-abtn hn-liked':'hn-abtn')+'" onclick="hnToggleLike(\''+p.id+'\')" onmouseenter="hnShowTooltip(event,\''+p.id+'\',\'likes\')" onmouseleave="hnHideTooltip()">'+
    '<svg viewBox="0 0 24 24" fill="'+(liked?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'+lc+'</button>'+
    '<button class="hn-abtn" onclick="hnToggleComments(\''+p.id+'\')">'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'+cc+'</button>'+
    (hn_user ? '<button class="hn-abtn" onclick="hnOpenShare(\''+p.id+'\')" onmouseenter="hnShowTooltip(event,\''+p.id+'\',\'shares\')" onmouseleave="hnHideTooltip()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'+(p.shares||0)+'</button>' : '')+
    '</div>'+
    '<div class="hn-comments" id="hn-cs-'+p.id+'">'+commHtml+cf+'</div>'+
    '</div></div></div>';
}

function hnRenderComments(cl, shown, pid) {
  var html = '';
  var total = cl.length;
  var limit = Math.min(shown, total);
  for (var ci = 0; ci < limit; ci++) {
    var c = cl[ci];
    var cid = pid + '_' + ci;
    var replies = c.replies || [];
    var repliesHtml = '';
    for (var ri = 0; ri < replies.length; ri++) {
      var r = replies[ri];
      var rid = cid + '_' + ri;
      var isReplyOwner = hn_user && hn_user.id === r.authorId;
      var replyOwnerHtml = isReplyOwner ?
        '<div class="hn-owner-actions" style="margin-top:2px!important;">'+
        '<button class="hn-edit-btn" onclick="hnEditReply(\''+pid+'\','+ci+','+ri+')">Modifica</button>'+
        '<button class="hn-del-btn" onclick="hnDeleteReply(\''+pid+'\','+ci+','+ri+')">Elimina</button>'+
        '</div>' : '';
      var replyEditedLabel = r.edited ? '<span class="hn-edited">· modificato</span>' : '';
      repliesHtml += '<div class="hn-ritem" id="hn-rid-'+rid+'">'+hnAvHtml(r.authorColor,r.authorAvatar||'',r.authorName,'hn-rav',null)+
        '<div class="hn-rbody"><div class="hn-rmeta"><span class="hn-rname">'+hnEsc(r.authorName)+'</span><span class="hn-rtime">'+hnAgo(r.createdAt)+'</span>'+replyEditedLabel+'</div>'+
        '<div class="hn-rtext" id="hn-rt-'+rid+'">'+hnMentionify(hnEsc(r.text))+'</div>'+replyOwnerHtml+'</div></div>';
    }
    var isCommentOwner = hn_user && hn_user.id === c.authorId;
    var commentOwnerHtml = isCommentOwner ?
      '<button class="hn-edit-btn" onclick="hnEditComment(\''+pid+'\','+ci+')">Modifica</button>'+
      '<button class="hn-del-btn" onclick="hnDeleteComment(\''+pid+'\','+ci+')">Elimina</button>' : '';
    var commentEditedLabel = c.edited ? '<span class="hn-edited">· modificato</span>' : '';
    var replyForm = hn_user ? '<div class="hn-reply-compose"><input type="text" placeholder="Rispondi a '+hnEsc(c.authorName)+'..." id="hn-ri-'+cid+'" oninput="hnMentionCheck(this);" onkeydown="hnMentionKey(event,this);if(event.key===\'Enter\')hnSubmitReply(\''+pid+'\','+ci+')" onblur="setTimeout(hnMentionHide,150);"><button class="hn-rsend" onclick="hnSubmitReply(\''+pid+'\','+ci+')">Invia</button></div>' : '';
    var repliesBlock = '<div class="hn-replies" id="hn-rep-'+cid+'">'+repliesHtml+replyForm+'</div>';
    var replyCount = replies.length ? ' ('+replies.length+')' : '';
    html += '<div class="hn-citem" id="hn-cid-'+cid+'">'+hnAvHtml(c.authorColor,c.authorAvatar||'',c.authorName,'hn-cav',null)+
      '<div class="hn-cbody">'+
      '<div class="hn-cmeta"><span class="hn-cname">'+hnEsc(c.authorName)+'</span><span class="hn-ctime">'+hnAgo(c.createdAt)+'</span>'+commentEditedLabel+'</div>'+
      '<div class="hn-ctext" id="hn-ct-'+cid+'">'+hnMentionify(hnEsc(c.text))+'</div>'+
      '<div class="hn-cactions-row">'+
      (hn_user ? '<button class="hn-cabtn" onclick="hnToggleReplies(\''+cid+'\')">Rispondi'+replyCount+'</button>' : '')+
      commentOwnerHtml+
      '</div>'+
      repliesBlock+
      '</div></div>';
  }
  if (total > shown) {
    var remaining = total - shown;
    html += '<button class="hn-abtn" style="margin:4px 0 8px!important;font-size:12px!important;color:#5b9cf6!important;" onclick="hnShowMoreComments(\''+pid+'\','+shown+')">'+
      'Mostra altre risposte ('+remaining+')</button>';
  }
  return html;
}

function hnShowMoreComments(pid, currentShown) {
  var post = null;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === pid) { post = hn_posts[i]; break; } }
  if (!post) return;
  var cs = document.getElementById('hn-cs-'+pid);
  if (!cs) return;
  var newShown = currentShown + 3;
  var cl = post.comments || [];
  var cf = hn_user ? '<div class="hn-ccompose"><input type="text" placeholder="Rispondi..." id="hn-ci-'+pid+'" onkeydown="if(event.key===\'Enter\')hnSubmitComment(\''+pid+'\')"><button class="hn-csend" onclick="hnSubmitComment(\''+pid+'\')">Invia</button></div>' : '';
  cs.innerHTML = hnRenderComments(cl, newShown, pid) + cf;
  cs.classList.add('hn-open');
  hnAttachMentionListeners();
}

/* ── LIKE / COMMENTI ── */
function hnToggleLike(pid) {
  if (!hn_user) { hnOpenModal('auth'); return; }
  var post=null; for (var i=0;i<hn_posts.length;i++) { if(hn_posts[i].id===pid){post=hn_posts[i];break;} }
  if (!post) return;
  if (!post.likes) post.likes=[];
  var idx=post.likes.indexOf(hn_user.id);
  if (idx===-1) post.likes.push(hn_user.id); else post.likes.splice(idx,1);
  var liked_now = idx===-1;
  hnPUT(hn_api+'/'+hn_bin_post,{posts:hn_posts},function(){
    hnRenderFeed();
    if (liked_now && post.authorId !== hn_user.id) {
      hnCreateNotif(post.authorId,'like',post.id,post.text);
    }
  },function(){alert('Errore like.');});
}
function hnToggleComments(pid) {
  var cs=document.getElementById('hn-cs-'+pid);
  if (!cs) return;
  if (cs.classList.contains('hn-open')) cs.classList.remove('hn-open'); else cs.classList.add('hn-open');
}
function hnSubmitComment(pid) {
  if (!hn_user) { hnOpenModal('auth'); return; }
  var inp=document.getElementById('hn-ci-'+pid);
  if (!inp) return;
  var text=inp.value.trim(); if (!text) return;
  var post=null; for (var i=0;i<hn_posts.length;i++) { if(hn_posts[i].id===pid){post=hn_posts[i];break;} }
  if (!post) return;
  if (!post.comments) post.comments=[];
  var cmt={id:String(Date.now()),authorId:hn_user.id,authorName:hn_user.name,
    authorHandle:hn_user.handle,authorColor:hn_user.color,authorAvatar:hn_user.avatar||'',
    text:text,createdAt:new Date().toISOString()};
  post.comments.push(cmt);
  hnPUT(hn_api+'/'+hn_bin_post,{posts:hn_posts},
    function(){
      hnRenderFeed(); setTimeout(function(){var cs=document.getElementById('hn-cs-'+pid);if(cs)cs.classList.add('hn-open');},50);
      if (post.authorId !== hn_user.id) hnCreateNotif(post.authorId,'comment',post.id,post.text);
      hnNotifMentions(text,post.id,post.text);
    },
    function(){ post.comments.pop(); alert('Errore commento.'); }
  );
}

/* ── SIDEBAR ── */
function hnRenderSidebar() { hnRenderTrend(); hnRenderHunters(); }
function hnRenderTrend() {
  var counts={};
  for (var i=0;i<hn_posts.length;i++) {
    var tags=hn_posts[i].text.match(/#\w+/g)||[];
    for (var j=0;j<tags.length;j++) counts[tags[j]]=(counts[tags[j]]||0)+1;
  }
  var sorted=[];
  for (var t in counts) sorted.push([t,counts[t]]);
  sorted.sort(function(a,b){return b[1]-a[1];}); sorted=sorted.slice(0,5);
  var el=document.getElementById('hn-trending');
  if (!sorted.length){el.innerHTML='<div style="font-size:12px;color:#a09a93;padding:4px 0;">Nessun trend ancora.</div>';return;}
  var html='';
  for (var k=0;k<sorted.length;k++)
    html+='<div class="hn-trend" onclick="hnFilterTag(\''+sorted[k][0]+'\')"><div class="hn-ttag">'+sorted[k][0]+'</div><div class="hn-tcount">'+sorted[k][1]+' post</div></div>';
  el.innerHTML=html;
}
function hnRenderHunters() {
  var el=document.getElementById('hn-hunters');
  var seen={}; var recent=[];
  for (var i=0;i<hn_posts.length;i++) {
    var p=hn_posts[i];
    if (!seen[p.authorId]){seen[p.authorId]=true;recent.push(p);}
    if (recent.length>=5) break;
  }
  if (!recent.length){el.innerHTML='<div style="font-size:12px;color:#a09a93;padding:4px 0;">Nessun cacciatore ancora.</div>';return;}
  var html='';
  for (var j=0;j<recent.length;j++) {
    var r=recent[j];
    html+='<div class="hn-hunter" onclick="hnOpenProfile(\''+r.authorId+'\')">'+
      hnAvHtml(r.authorColor,r.authorAvatar||'',r.authorName,'hn-hav',null)+
      '<div style="margin:0!important;text-align:left!important;"><div class="hn-hname">'+hnEsc(r.authorName)+hnVerifiedBadge(hnProfileById(r.authorId))+'</div><div class="hn-htag2">@'+hnEsc(r.authorHandle)+'</div></div></div>';
  }
  el.innerHTML=html;
}
function hnFilterTag(tag) {
  hn_tab_cur='tag';
  var tabs=document.querySelectorAll('.hn-tab');
  for (var i=0;i<tabs.length;i++) tabs[i].classList.remove('hn-active');
  var fp=[]; var list=document.getElementById('hn-posts');
  for (var j=0;j<hn_posts.length;j++){if(hn_posts[j].text.indexOf(tag)!==-1)fp.push(hn_posts[j]);}
  if(!fp.length){list.innerHTML='<div class="hn-msg">Nessun post con questo tag.</div>';return;}
  var html=''; for (var k=0;k<fp.length;k++) html+=hnRenderPost(fp[k]);
  list.innerHTML=html;
}

/* ── PROFILE ── */
function hnOpenProfile(aid) {
  var prof=null; for(var i=0;i<hn_profiles.length;i++){if(hn_profiles[i].id===aid){prof=hn_profiles[i];break;}}
  if(!prof) return;
  var up=[]; var tl=0;
  for(var j=0;j<hn_posts.length;j++){if(hn_posts[j].authorId===aid){up.push(hn_posts[j]);tl+=(hn_posts[j].likes||[]).length;}}
  var is_me = hn_user && hn_user.id === aid;
  var my_prof = null;
  if (hn_user) { for(var m=0;m<hn_profiles.length;m++){if(hn_profiles[m].id===hn_user.id){my_prof=hn_profiles[m];break;}} }
  var my_following = (my_prof && my_prof.following) ? my_prof.following : [];
  var is_following = false;
  for(var fi=0;fi<my_following.length;fi++){if(my_following[fi]===aid){is_following=true;break;}}
  var followers = [];
  for(var fp=0;fp<hn_profiles.length;fp++){
    var pf=hn_profiles[fp]; var pff=pf.following||[];
    for(var ff=0;ff<pff.length;ff++){if(pff[ff]===aid){followers.push(pf);break;}}
  }
  var follow_btn = (hn_user && !is_me) ?
    '<button class="hn-follow-btn'+(is_following?' hn-following':'')+'" onclick="hnToggleFollow(\''+aid+'\')">'+
    (is_following?'Segui già':'Segui')+'</button>' : '';
  var rh='';
  var sl=up.slice(0,5);
  for(var k=0;k<sl.length;k++)
    rh+='<div style="padding:0.75rem 0;border-bottom:1px solid #313846;margin:0;">'+
      '<div class="hn-ptext" style="margin:0;">'+sl[k].text.replace(/(#\w+)/g,'<span class="hn-hi">$1</span>')+'</div>'+
      (sl[k].imgUrl?'<img src="'+hnEsc(sl[k].imgUrl)+'" style="max-width:100%;max-height:120px;border-radius:6px;margin-top:6px;object-fit:cover;display:block;" onerror="this.style.display=\'none\'">':'')+
      '<div style="font-size:11px;color:#5b6577;margin-top:4px;">'+hnAgo(sl[k].createdAt)+' \u00b7 '+(sl[k].likes||[]).length+' like</div></div>';
  var prof_following = prof.following || [];
  var following_html = '';
  for(var pfi=0;pfi<prof_following.length;pfi++){
    var pf2=null; for(var pp=0;pp<hn_profiles.length;pp++){if(hn_profiles[pp].id===prof_following[pfi]){pf2=hn_profiles[pp];break;}}
    if(!pf2) continue;
    following_html+='<div class="hn-fitem" onclick="hnCloseModal(\'prof\');hnOpenProfile(\''+pf2.id+'\')">'+
      hnAvHtml(pf2.color,pf2.avatar||'',pf2.name,'hn-hav',null)+
      '<div style="margin:0!important;"><div class="hn-fitem-name">'+hnEsc(pf2.name)+'</div><div class="hn-fitem-handle">@'+hnEsc(pf2.handle)+'</div></div></div>';
  }
  var followers_html = '';
  for(var fri=0;fri<followers.length;fri++){
    var fr=followers[fri];
    followers_html+='<div class="hn-fitem" onclick="hnCloseModal(\'prof\');hnOpenProfile(\''+fr.id+'\')">'+
      hnAvHtml(fr.color,fr.avatar||'',fr.name,'hn-hav',null)+
      '<div style="margin:0!important;"><div class="hn-fitem-name">'+hnEsc(fr.name)+'</div><div class="hn-fitem-handle">@'+hnEsc(fr.handle)+'</div></div></div>';
  }
  var edit_btn = is_me ?
    '<button class="hn-follow-btn" style="margin-left:auto!important;" onclick="hnOpenEditProfile()">Modifica</button>' : '';
  document.getElementById('hn-profcontent').innerHTML=
    '<div class="hn-profhead">'+hnAvHtml(prof.color,prof.avatar||'',prof.name,'hn-profav',null)+
    '<div class="hn-profinfo"><h2 style="cursor:pointer!important;" onclick="hnCloseModal(\'prof\');hnFilterUser(\''+aid+'\',\''+hnEsc(prof.name)+'\')">'+hnEsc(prof.name)+'</h2><div class="hn-profhandle">@'+hnEsc(prof.handle)+'</div>'+
    '<div style="margin-top:6px;"><span class="hn-rank '+hnRankClass(prof.rank)+'">'+hnEsc(prof.rank||'')+'</span></div></div>'+
    (is_me ? edit_btn : follow_btn)+'</div>'+
    (prof.bio?'<p class="hn-profbio">'+hnEsc(prof.bio)+'</p>':'')+
    '<div class="hn-profstats">'+
    '<div class="hn-pstat"><span class="hn-pnum">'+up.length+'</span><span class="hn-plbl">Post</span></div>'+
    '<div class="hn-pstat"><span class="hn-pnum">'+tl+'</span><span class="hn-plbl">Like ricevuti</span></div>'+
    '<div class="hn-pstat"><span class="hn-pnum">'+prof_following.length+'</span><span class="hn-plbl">Seguiti</span></div>'+
    '<div class="hn-pstat"><span class="hn-pnum">'+followers.length+'</span><span class="hn-plbl">Follower</span></div>'+
    '</div>'+
    '<div class="hn-prof-tabs">'+
    '<button class="hn-prof-tab hn-active" onclick="hnProfTab(\'posts\',this)">Post recenti</button>'+
    '<button class="hn-prof-tab" onclick="hnProfTab(\'following\',this)">Seguiti ('+prof_following.length+')</button>'+
    '<button class="hn-prof-tab" onclick="hnProfTab(\'followers\',this)">Follower ('+followers.length+')</button>'+
    '</div>'+
    '<div id="hn-prof-posts">'+
    (rh||'<div style="font-size:13px;color:#5b6577;padding:0.5rem 0;">Nessun post ancora.</div>')+
    '</div>'+
    '<div id="hn-prof-following" style="display:none;">'+
    '<div class="hn-flist">'+(following_html||'<div style="font-size:13px;color:#5b6577;padding:0.5rem 0;">Non segue ancora nessuno.</div>')+'</div>'+
    '</div>'+
    '<div id="hn-prof-followers" style="display:none;">'+
    '<div class="hn-flist">'+(followers_html||'<div style="font-size:13px;color:#5b6577;padding:0.5rem 0;">Nessun follower ancora.</div>')+'</div>'+
    '</div>';
  hnOpenModal('prof');
}

function hnProfTab(tab, el) {
  var tabs = document.querySelectorAll('.hn-prof-tab');
  for (var i=0;i<tabs.length;i++) tabs[i].classList.remove('hn-active');
  el.classList.add('hn-active');
  var sections = ['posts','following','followers'];
  for (var s=0;s<sections.length;s++) {
    var sec = document.getElementById('hn-prof-'+sections[s]);
    if (sec) sec.style['display'] = sections[s]===tab ? 'block' : 'none';
  }
}

function hnOpenEditProfile() {
  if (!hn_user) return;
  var prof = null;
  for (var i = 0; i < hn_profiles.length; i++) { if (hn_profiles[i].id === hn_user.id) { prof = hn_profiles[i]; break; } }
  if (!prof) return;
  var ranks = ['★★★ Hunter','★★ Hunter','★ Hunter','Hunter','Apprendista','Lottatore Celeste','Civile'];
  var rank_opts = '';
  for (var r = 0; r < ranks.length; r++) {
    rank_opts += '<option value="'+hnEsc(ranks[r])+'"'+(prof.rank===ranks[r]?' selected':'')+'>'+hnEsc(ranks[r])+'</option>';
  }
  var colors_html = '';
  for (var c = 0; c < hn_colors.length; c++) {
    colors_html += '<div class="hn-swatch'+(hn_colors[c]===prof.color?' hn-sel':'')+'" style="background:'+hn_colors[c]+'!important;" onclick="hnEditPickColor(\''+hn_colors[c]+'\',this)"></div>';
  }
  document.getElementById('hn-profcontent').innerHTML =
    '<h2 style="margin-bottom:4px!important;">Modifica profilo</h2>'+
    '<p class="hn-msub">Le modifiche saranno visibili subito.</p>'+
    '<div class="hn-avrow">'+
      '<div id="hn-edit-av-preview" class="hn-avpreview" style="background:'+prof.color+'!important;">'+
        (prof.avatar ? '<img src="'+hnEsc(prof.avatar)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display=\'none\'">' : hnInitials(prof.name))+
      '</div>'+
      '<div class="hn-field" style="flex:1!important;margin:0!important;">'+
        '<label>URL AVATAR</label>'+
        '<input id="hn-edit-avatar" type="text" value="'+hnEscAttr(prof.avatar||'')+'" placeholder="https://..." oninput="hnEditPreviewAvatar()">'+
      '</div>'+
    '</div>'+
    '<div class="hn-field"><label>COLORE AVATAR</label><div class="hn-cpicker" id="hn-edit-cpicker">'+colors_html+'</div></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+
      '<div class="hn-field"><label>NOME / COGNOME</label><input id="hn-edit-name" type="text" value="'+hnEscAttr(prof.name)+'"></div>'+
      '<div class="hn-field"><label>NICKNAME (@unico)</label><input id="hn-edit-handle" type="text" value="'+hnEscAttr(prof.handle)+'"></div>'+
    '</div>'+
    '<div class="hn-field"><label>RANK</label>'+
      '<select id="hn-edit-rank">'+rank_opts+'</select>'+
    '</div>'+
    '<div class="hn-field"><label>BIO</label><textarea id="hn-edit-bio" style="min-height:60px!important;">'+hnEscVal(prof.bio||'')+'</textarea></div>'+
    '<div class="hn-field"><label>NUOVA PASSWORD (lascia vuoto per non cambiare)</label>'+
      '<div class="hn-pwrap">'+
        '<input id="hn-edit-pw" type="password" placeholder="Nuova password...">'+
        '<button class="hn-peye" onclick="hnTogglePw(\'hn-edit-pw\',this)" title="Mostra/nascondi">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'+
        '</button>'+
      '</div>'+
    '</div>'+
    '<div class="hn-errmsg" id="hn-edit-err"></div>'+
    '<div class="hn-mactions">'+
      '<button class="hn-gbtn" onclick="hnOpenProfile(\''+hn_user.id+'\')">Annulla</button>'+
      '<button class="hn-dbtn" onclick="hnSaveProfile()">Salva</button>'+
    '</div>';
  hn_edit_color = prof.color;
}

var hn_edit_color = '';

function hnEditPickColor(c, el) {
  hn_edit_color = c;
  var sw = document.querySelectorAll('#hn-edit-cpicker .hn-swatch');
  for (var i = 0; i < sw.length; i++) sw[i].classList.remove('hn-sel');
  el.classList.add('hn-sel');
  var prev = document.getElementById('hn-edit-av-preview');
  if (prev) prev.style['background'] = c;
}

function hnEditPreviewAvatar() {
  var url = document.getElementById('hn-edit-avatar').value.trim();
  var prev = document.getElementById('hn-edit-av-preview');
  if (!prev) return;
  prev.style['background'] = hn_edit_color;
  if (url) {
    prev.innerHTML = '<img src="'+hnEsc(url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display=\'none\'">';
  } else {
    var name_el = document.getElementById('hn-edit-name');
    prev.innerHTML = hnInitials(name_el ? name_el.value : hn_user.name);
  }
}

function hnSaveProfile() {
  var name   = document.getElementById('hn-edit-name').value.trim();
  var handle = document.getElementById('hn-edit-handle').value.trim().replace('@','');
  var rank   = document.getElementById('hn-edit-rank').value;
  var bio    = document.getElementById('hn-edit-bio').value.trim();
  var avatar = document.getElementById('hn-edit-avatar').value.trim();
  var new_pw = document.getElementById('hn-edit-pw').value;

  if (!name || !handle || !rank) return hnShowErr('hn-edit-err','Compila tutti i campi obbligatori.');
  if (handle.length < 3) return hnShowErr('hn-edit-err','Nickname troppo corto (min 3 caratteri).');

  var hn_ok = true;
  for (var ci = 0; ci < handle.length; ci++) {
    var ch = handle.charCodeAt(ci);
    if (!((ch>=65&&ch<=90)||(ch>=97&&ch<=122)||(ch>=48&&ch<=57)||ch===95)) { hn_ok=false; break; }
  }
  if (!hn_ok) return hnShowErr('hn-edit-err','Nickname: solo lettere, numeri e _.');

  for (var i = 0; i < hn_creds.length; i++) {
    if (hn_creds[i].handle.toLowerCase() === handle.toLowerCase() && hn_creds[i].id !== hn_user.id)
      return hnShowErr('hn-edit-err','Nickname già in uso.');
  }

  var prof_idx = -1;
  for (var j = 0; j < hn_profiles.length; j++) { if (hn_profiles[j].id === hn_user.id) { prof_idx = j; break; } }
  if (prof_idx === -1) return;

  var cred_idx = -1;
  for (var k = 0; k < hn_creds.length; k++) { if (hn_creds[k].id === hn_user.id) { cred_idx = k; break; } }

  hn_profiles[prof_idx].name   = name;
  hn_profiles[prof_idx].handle = handle;
  hn_profiles[prof_idx].rank   = rank;
  hn_profiles[prof_idx].bio    = bio;
  hn_profiles[prof_idx].avatar = avatar;
  hn_profiles[prof_idx].color  = hn_edit_color;

  if (cred_idx !== -1) {
    hn_creds[cred_idx].handle = handle;
    if (new_pw && new_pw.length >= 4) hn_creds[cred_idx].password = new_pw;
    else if (new_pw && new_pw.length > 0) return hnShowErr('hn-edit-err','La password deve essere di almeno 4 caratteri.');
  }

  hn_user = hn_profiles[prof_idx];
  sessionStorage.setItem('hn_user', JSON.stringify(hn_user));

  var btn = document.querySelector('#hn-profcontent .hn-dbtn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  var saved = 0;
  function onDone() {
    saved++;
    if (saved < 2) return;
    hnSetLoggedIn();
    hnRenderFeed();
    hnOpenProfile(hn_user.id);
  }
  hnPUT(hn_api+'/'+hn_bin_prof, {profiles:hn_profiles}, onDone, function(){ hnShowErr('hn-edit-err','Errore nel salvataggio.'); });
  hnPUT(hn_api+'/'+hn_bin_cred, {credentials:hn_creds}, onDone, function(){ hnShowErr('hn-edit-err','Errore nel salvataggio.'); });
}
function hnToggleFollow(aid) {
  if (!hn_user) { hnOpenModal('auth'); return; }
  var my_prof = null;
  for(var i=0;i<hn_profiles.length;i++){if(hn_profiles[i].id===hn_user.id){my_prof=hn_profiles[i];break;}}
  if (!my_prof) return;
  if (!my_prof.following) my_prof.following = [];
  var idx = -1;
  for(var j=0;j<my_prof.following.length;j++){if(my_prof.following[j]===aid){idx=j;break;}}
  if (idx === -1) my_prof.following.push(aid);
  else my_prof.following.splice(idx,1);
  hn_user.following = my_prof.following;
  sessionStorage.setItem('hn_user', JSON.stringify(hn_user));
  var was_following = idx !== -1;
  hnPUT(hn_api+'/'+hn_bin_prof, {profiles:hn_profiles},
    function(){ if(!was_following) hnCreateNotif(aid,'follow','',''); hnUpdateBadge(); hnOpenProfile(aid); },
    function(){ if(idx===-1)my_prof.following.pop();else my_prof.following.splice(idx,0,aid); alert('Errore nel salvataggio.'); }
  );
}

/* ── COLOR PICKER ── */
function hnBuildColorPicker() {
  var html='';
  for(var i=0;i<hn_colors.length;i++)
    html+='<div class="hn-swatch'+(hn_colors[i]===hn_sel_color?' hn-sel':'')+'" style="background:'+hn_colors[i]+';" onclick="hnPickColor(\''+hn_colors[i]+'\',this)"></div>';
  document.getElementById('hn-cpicker').innerHTML=html;
}
function hnPickColor(c,el) {
  hn_sel_color=c;
  var sw=document.querySelectorAll('.hn-swatch');
  for(var i=0;i<sw.length;i++) sw[i].classList.remove('hn-sel');
  el.classList.add('hn-sel');
  hnPreviewAvatar();
}

/* ── MODALS ── */
function hnOpenModal(id) {
  var el=document.getElementById('hn-modal-'+id);
  if(!el) return;
  el.style.display='flex'; el.style['z-index']='99999';
}
function hnCloseModal(id) {
  var el=document.getElementById('hn-modal-'+id);
  if(el) el.style.display='none';
}
document.addEventListener('click',function(e){
  var drop=document.getElementById('hn-notif-drop');
  var bell=document.getElementById('hn-bell-btn');
  if(drop&&bell&&e.target!==bell&&!bell.contains(e.target)&&!drop.contains(e.target)){drop.style['display']='none';}
  var ids=['auth','reg','prof'];
  for(var i=0;i<ids.length;i++){
    var m=document.getElementById('hn-modal-'+ids[i]);
    if(m&&e.target===m) hnCloseModal(ids[i]);
  }
});

/* ── LIGHTBOX ── */
function hnOpenLightbox(src) {
  var lb=document.getElementById('hn-lightbox');
  document.getElementById('hn-lb-img').src=src;
  lb.classList.add('hn-open');
  lb.style['z-index']='99999';
}
function hnCloseLightbox() {
  document.getElementById('hn-lightbox').classList.remove('hn-open');
}

/* ── NOTIFICHE ── */
function hnUpdateBadge() {
  if (!hn_user) return;
  var count = 0;
  for (var i = 0; i < hn_notifs.length; i++) {
    if (hn_notifs[i].to_id === hn_user.id && !hn_notifs[i].read) count++;
  }
  var badge = document.getElementById('hn-bell-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style['display'] = 'flex';
  } else {
    badge.style['display'] = 'none';
  }
}

function hnCreateNotif(to_id, type, post_id, post_text) {
  if (!hn_user) return;
  if (to_id === hn_user.id) return;
  var notif = {
    id: String(Date.now()),
    to_id: to_id,
    from_id: hn_user.id,
    from_name: hn_user.name,
    from_handle: hn_user.handle,
    from_color: hn_user.color,
    from_avatar: hn_user.avatar || '',
    type: type,
    post_id: post_id || '',
    post_text: post_text ? post_text.substring(0, 60) : '',
    read: false,
    created_at: new Date().toISOString()
  };
  hn_notifs.unshift(notif);
  if (hn_notifs.length > 100) hn_notifs = hn_notifs.slice(0, 100);
  hnPUT(hn_api + '/' + hn_bin_notif, {notifications: hn_notifs}, function(){}, function(){ hn_notifs.shift(); });
}

function hnNotifMentions(text, post_id, post_text) {
  var found = {};
  var i = 0;
  while (i < text.length) {
    if (text.charAt(i) === '@') {
      var handle = '';
      var j = i + 1;
      while (j < text.length) {
        var code = text.charCodeAt(j);
        var ok = (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57) || code === 95;
        if (ok) { handle += text.charAt(j); j++; } else break;
      }
      if (handle && !found[handle.toLowerCase()]) {
        found[handle.toLowerCase()] = true;
        for (var k = 0; k < hn_profiles.length; k++) {
          if (hn_profiles[k].handle.toLowerCase() === handle.toLowerCase()) {
            hnCreateNotif(hn_profiles[k].id, 'mention', post_id, post_text);
            break;
          }
        }
      }
      i = j;
    } else { i++; }
  }
}

function hnToggleNotifDrop() {
  var drop = document.getElementById('hn-notif-drop');
  if (!drop) return;
  if (drop.style['display'] === 'none' || drop.style['display'] === '') {
    hnRenderNotifDrop();
    var btn = document.getElementById('hn-bell-btn');
    var rect = btn.getBoundingClientRect();
    drop.style['top'] = (rect.bottom + 6) + 'px';
    drop.style['right'] = (window.innerWidth - rect.right) + 'px';
    drop.style['left'] = 'auto';
    drop.style['display'] = 'block';
    drop.style['z-index'] = '99999';
  } else {
    drop.style['display'] = 'none';
  }
}

function hnRenderNotifDrop() {
  if (!hn_user) return;
  var drop = document.getElementById('hn-notif-drop');
  var mine = [];
  for (var i = 0; i < hn_notifs.length; i++) {
    if (hn_notifs[i].to_id === hn_user.id) mine.push(hn_notifs[i]);
  }
  var labels = { like:'ha messo like al tuo post', comment:'ha commentato il tuo post', share:'ha condiviso il tuo post', mention:'ti ha menzionato', follow:'ha iniziato a seguirti' };
  var html = '<div class="hn-notif-header"><span class="hn-notif-title">Notifiche</span>' +
    (mine.length ? '<button class="hn-notif-clear" onclick="hnMarkAllRead()">Segna tutte come lette</button>' : '') +
    '</div>';
  if (!mine.length) {
    html += '<div class="hn-notif-empty">Nessuna notifica ancora.</div>';
  } else {
    for (var j = 0; j < mine.length; j++) {
      var n = mine[j];
      var label = labels[n.type] || n.type;
      var unread = !n.read ? ' hn-unread' : '';
      html += '<div class="hn-notif-item' + unread + '" onclick="hnNotifClick(\'' + n.id + '\',\'' + (n.post_id||'') + '\',\'' + (n.from_id||'') + '\',\'' + n.type + '\')">' +
        hnAvHtml(n.from_color, n.from_avatar, n.from_name, 'hn-notif-icon', null) +
        '<div class="hn-notif-body">' +
        '<div class="hn-notif-text"><strong>' + hnEsc(n.from_name) + '</strong> ' + label +
        (n.post_text ? '<br><span style="color:#5b6577!important;font-size:11px!important;">' + hnEsc(n.post_text) + (n.post_text.length >= 60 ? '...' : '') + '</span>' : '') +
        '</div>' +
        '<span class="hn-notif-time">' + hnAgo(n.created_at) + '</span>' +
        '</div></div>';
    }
  }
  drop.innerHTML = html;
}

function hnNotifClick(nid, post_id, from_id, type) {
  hnMarkRead(nid);
  document.getElementById('hn-notif-drop').style['display'] = 'none';
  document.getElementById('hn-bell-badge').style['display'] = 'none';
  if (type === 'follow') {
    if (from_id) hnOpenProfile(from_id);
  } else if (post_id) {
    var el = document.getElementById('hn-p-' + post_id);
    if (el) {
      if (hn_tab_cur !== 'all') {
        hn_tab_cur = 'all';
        var tabs = document.querySelectorAll('.hn-tab');
        for (var i=0;i<tabs.length;i++) tabs[i].classList.remove('hn-active');
        var allTab = tabs[0]; if(allTab) allTab.classList.add('hn-active');
        hnRenderFeed();
      }
      setTimeout(function() {
        var target = document.getElementById('hn-p-' + post_id);
        if (target) {
          target.scrollIntoView({behavior:'smooth',block:'center'});
          target.style['background'] = '#243448';
          setTimeout(function(){ target.style['background'] = ''; }, 1500);
        }
      }, 100);
    }
  }
}

function hnMarkRead(nid) {
  for (var i = 0; i < hn_notifs.length; i++) {
    if (hn_notifs[i].id === nid) { hn_notifs[i].read = true; break; }
  }
  hnUpdateBadge();
  hnPUT(hn_api + '/' + hn_bin_notif, {notifications: hn_notifs}, function(){}, function(){});
}

function hnMarkAllRead() {
  if (!hn_user) return;
  for (var i = 0; i < hn_notifs.length; i++) {
    if (hn_notifs[i].to_id === hn_user.id) hn_notifs[i].read = true;
  }
  hnUpdateBadge();
  hnRenderNotifDrop();
  hnPUT(hn_api + '/' + hn_bin_notif, {notifications: hn_notifs}, function(){}, function(){});
}

function hnBellShow() {
  var w = document.getElementById('hn-bell-wrap');
  if (w) w.classList.add('hn-vis');
  hnUpdateBadge();
}
function hnBellHide() {
  var w = document.getElementById('hn-bell-wrap');
  if (w) w.classList.remove('hn-vis');
  var drop = document.getElementById('hn-notif-drop');
  if (drop) drop.style['display'] = 'none';
}

/* ── TOOLTIP LIKES/SHARES ── */
function hnShowTooltip(e, pid, type) {
  var post = null;
  for (var i=0;i<hn_posts.length;i++){if(hn_posts[i].id===pid){post=hn_posts[i];break;}}
  if (!post) return;
  var tip = document.getElementById('hn-tooltip');
  var names = [];
  if (type === 'likes') {
    var likes = post.likes || [];
    for (var j=0;j<likes.length;j++){
      for (var k=0;k<hn_profiles.length;k++){if(hn_profiles[k].id===likes[j]){names.push(hnEsc(hn_profiles[k].name));break;}}
    }
    tip.innerHTML = names.length ? '<strong style="color:#5b6577;font-size:10px;display:block;margin-bottom:4px;">MI PIACE</strong>'+names.join('<br>') : 'Nessun like ancora.';
  } else {
    var shares = [];
    for (var s=0;s<hn_posts.length;s++){
      if (hn_posts[s].sharedPost && hn_posts[s].sharedPost.id===pid) shares.push(hnEsc(hn_posts[s].authorName));
    }
    tip.innerHTML = shares.length ? '<strong style="color:#5b6577;font-size:10px;display:block;margin-bottom:4px;">CONDIVISIONI</strong>'+shares.join('<br>') : 'Nessuna condivisione ancora.';
  }
  tip.style['display'] = 'block';
  tip.style['z-index'] = '99998';
  var rect = e.target.getBoundingClientRect();
  tip.style['left'] = rect.left + 'px';
  tip.style['top'] = (rect.bottom + 6) + 'px';
}
function hnHideTooltip() {
  var tip = document.getElementById('hn-tooltip');
  if (tip) tip.style['display'] = 'none';
}
function hnEditPost(pid) {
  var post = null;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === pid) { post = hn_posts[i]; break; } }
  if (!post) return;
  var el = document.getElementById('hn-pt-'+pid);
  if (!el) return;
  el.innerHTML = '<textarea class="hn-inline-edit" id="hn-pe-'+pid+'" oninput="hnMentionCheck(this);" onkeydown="hnMentionKey(event,this);" onblur="setTimeout(hnMentionHide,150);">'+hnEscVal(post.text)+'</textarea>'+
    '<div class="hn-edit-row">'+
    '<button class="hn-cancel-btn" onclick="hnRenderFeed()">Annulla</button>'+
    '<button class="hn-save-btn" onclick="hnSavePost(\''+pid+'\')">Salva</button>'+
    '</div>';
}
function hnSavePost(pid) {
  var ta = document.getElementById('hn-pe-'+pid);
  if (!ta) return;
  var text = ta.value.trim();
  if (!text) return;
  for (var i = 0; i < hn_posts.length; i++) {
    if (hn_posts[i].id === pid) { hn_posts[i].text = text; hn_posts[i].edited = true; break; }
  }
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts}, function(){ hnRenderFeed(); }, function(){ alert('Errore nel salvataggio.'); hnRenderFeed(); });
}
function hnDeletePost(pid) {
  if (!confirm('Eliminare questo post?')) return;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === pid) { hn_posts.splice(i,1); break; } }
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts}, function(){ hnRenderFeed(); hnRenderSidebar(); }, function(){ alert('Errore nell\'eliminazione.'); hnRenderFeed(); });
}

function hnEditComment(pid, ci) {
  var post = null;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === pid) { post = hn_posts[i]; break; } }
  if (!post || !post.comments[ci]) return;
  var cid = pid + '_' + ci;
  var el = document.getElementById('hn-ct-'+cid);
  if (!el) return;
  el.innerHTML = '<input class="hn-inline-edit-small" id="hn-ce-'+cid+'" type="text" value="'+hnEscAttr(post.comments[ci].text)+'" oninput="hnMentionCheck(this);" onkeydown="hnMentionKey(event,this);if(event.key===\'Enter\')hnSaveComment(\''+pid+'\','+ci+')" onblur="setTimeout(hnMentionHide,150);">'+
    '<div class="hn-edit-row">'+
    '<button class="hn-cancel-btn" onclick="hnRenderFeed()">Annulla</button>'+
    '<button class="hn-save-btn" onclick="hnSaveComment(\''+pid+'\','+ci+')">Salva</button>'+
    '</div>';
}
function hnSaveComment(pid, ci) {
  var cid = pid + '_' + ci;
  var inp = document.getElementById('hn-ce-'+cid);
  if (!inp) return;
  var text = inp.value.trim(); if (!text) return;
  for (var i = 0; i < hn_posts.length; i++) {
    if (hn_posts[i].id === pid) { hn_posts[i].comments[ci].text = text; hn_posts[i].comments[ci].edited = true; break; }
  }
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts},
    function(){ hnRenderFeed(); setTimeout(function(){ var cs=document.getElementById('hn-cs-'+pid); if(cs)cs.classList.add('hn-open'); },50); },
    function(){ alert('Errore nel salvataggio.'); hnRenderFeed(); }
  );
}
function hnDeleteComment(pid, ci) {
  if (!confirm('Eliminare questo commento?')) return;
  for (var i = 0; i < hn_posts.length; i++) {
    if (hn_posts[i].id === pid) { hn_posts[i].comments.splice(ci,1); break; }
  }
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts},
    function(){ hnRenderFeed(); setTimeout(function(){ var cs=document.getElementById('hn-cs-'+pid); if(cs)cs.classList.add('hn-open'); },50); },
    function(){ alert('Errore nell\'eliminazione.'); hnRenderFeed(); }
  );
}

function hnEditReply(pid, ci, ri) {
  var post = null;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === pid) { post = hn_posts[i]; break; } }
  if (!post || !post.comments[ci] || !post.comments[ci].replies[ri]) return;
  var cid = pid + '_' + ci;
  var rid = cid + '_' + ri;
  var el = document.getElementById('hn-rt-'+rid);
  if (!el) return;
  el.innerHTML = '<input class="hn-inline-edit-small" id="hn-re-'+rid+'" type="text" value="'+hnEscAttr(post.comments[ci].replies[ri].text)+'" oninput="hnMentionCheck(this);" onkeydown="hnMentionKey(event,this);if(event.key===\'Enter\')hnSaveReply(\''+pid+'\','+ci+','+ri+')" onblur="setTimeout(hnMentionHide,150);">'+
    '<div class="hn-edit-row">'+
    '<button class="hn-cancel-btn" onclick="hnRenderFeed()">Annulla</button>'+
    '<button class="hn-save-btn" onclick="hnSaveReply(\''+pid+'\','+ci+','+ri+')">Salva</button>'+
    '</div>';
}
function hnSaveReply(pid, ci, ri) {
  var cid = pid + '_' + ci;
  var rid = cid + '_' + ri;
  var inp = document.getElementById('hn-re-'+rid);
  if (!inp) return;
  var text = inp.value.trim(); if (!text) return;
  for (var i = 0; i < hn_posts.length; i++) {
    if (hn_posts[i].id === pid) { hn_posts[i].comments[ci].replies[ri].text = text; hn_posts[i].comments[ci].replies[ri].edited = true; break; }
  }
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts},
    function(){
      hnRenderFeed();
      setTimeout(function(){
        var cs = document.getElementById('hn-cs-'+pid); if(cs) cs.classList.add('hn-open');
        var rep = document.getElementById('hn-rep-'+pid+'_'+ci); if(rep) rep.classList.add('hn-open');
      },50);
    },
    function(){ alert('Errore nel salvataggio.'); hnRenderFeed(); }
  );
}
function hnDeleteReply(pid, ci, ri) {
  if (!confirm('Eliminare questa risposta?')) return;
  for (var i = 0; i < hn_posts.length; i++) {
    if (hn_posts[i].id === pid) { hn_posts[i].comments[ci].replies.splice(ri,1); break; }
  }
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts},
    function(){
      hnRenderFeed();
      setTimeout(function(){
        var cs = document.getElementById('hn-cs-'+pid); if(cs) cs.classList.add('hn-open');
        var rep = document.getElementById('hn-rep-'+pid+'_'+ci); if(rep) rep.classList.add('hn-open');
      },50);
    },
    function(){ alert('Errore nell\'eliminazione.'); hnRenderFeed(); }
  );
}

function hnEscVal(s) {
  if (!s) return '';
  return s.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
}
function hnEscAttr(s) {
  if (!s) return '';
  return s.split('&').join('&amp;').split('"').join('&quot;').split("'").join('&#39;').split('<').join('&lt;').split('>').join('&gt;');
}

var hn_share_pid = null;
var hn_mention_target = null;
var hn_mention_sel = -1;

function hnMentionify(text) {
  return text.replace(/@([a-zA-Z0-9_]+)/g, function(match, handle) {
    var found = false;
    for (var i = 0; i < hn_profiles.length; i++) {
      if (hn_profiles[i].handle.toLowerCase() === handle.toLowerCase()) { found = true; break; }
    }
    if (found) return '<span class="hn-mention" onclick="hnOpenProfileByHandle(\''+handle+'\')">@'+hnEsc(handle)+'</span>';
    return match;
  });
}

function hnProfileById(id) {
  for (var i = 0; i < hn_profiles.length; i++) { if (hn_profiles[i].id === id) return hn_profiles[i]; }
  return null;
}

function hnOpenProfileByHandle(handle) {
  for (var i = 0; i < hn_profiles.length; i++) {
    if (hn_profiles[i].handle.toLowerCase() === handle.toLowerCase()) {
      hnOpenProfile(hn_profiles[i].id); return;
    }
  }
}

/* mention handlers are inline on elements */

function hnMentionCheck(el) {
  var val = el.value;
  var pos = el.selectionStart;
  var before = val.substring(0, pos);
  var query = '';
  var foundAt = false;
  for (var i = before.length - 1; i >= 0; i--) {
    var ch = before.charAt(i);
    var code = before.charCodeAt(i);
    var isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    var isDigit  = (code >= 48 && code <= 57);
    var isUnder  = (code === 95);
    if (isLetter || isDigit || isUnder) {
      query = ch + query;
    } else if (ch === '@') {
      foundAt = true;
      break;
    } else {
      break;
    }
  }
  if (!foundAt) { hnMentionHide(); return; }
  var q = query.toLowerCase();
  var results = [];
  for (var j = 0; j < hn_profiles.length; j++) {
    var p = hn_profiles[j];
    if (p.handle.toLowerCase().indexOf(q) === 0 || p.name.toLowerCase().indexOf(q) === 0) {
      results.push(p);
    }
    if (results.length >= 5) break;
  }
  if (!results.length) { hnMentionHide(); return; }
  hn_mention_target = el;
  hn_mention_sel = -1;
  hnMentionShow(results, el);
}

function hnMentionShow(results, el) {
  var drop = document.getElementById('hn-mention-drop');
  var html = '';
  for (var i = 0; i < results.length; i++) {
    var p = results[i];
    html += '<div class="hn-mention-item" data-handle="'+hnEsc(p.handle)+'" onmousedown="hnMentionPick(\''+hnEsc(p.handle)+'\')">'+
      hnAvHtml(p.color, p.avatar||'', p.name, 'hn-mention-av', null)+
      '<div style="margin:0!important;text-align:left!important;">'+
      '<div class="hn-mention-name">'+hnEsc(p.name)+'</div>'+
      '<div class="hn-mention-handle">@'+hnEsc(p.handle)+'</div>'+
      '</div></div>';
  }
  drop.innerHTML = html;
  var rect = el.getBoundingClientRect();
  drop.style['position'] = 'fixed';
  drop.style['left'] = rect.left + 'px';
  drop.style['top'] = (rect.bottom + 4) + 'px';
  drop.style['display'] = 'block';
  drop.style['z-index'] = '99999';
}

function hnMentionHide() {
  var drop = document.getElementById('hn-mention-drop');
  drop.style['display'] = 'none';
  hn_mention_target = null;
  hn_mention_sel = -1;
}

function hnMentionPick(handle) {
  if (!hn_mention_target) return;
  var el = hn_mention_target;
  var val = el.value;
  var pos = el.selectionStart;
  var before = val.substring(0, pos);
  var after = val.substring(pos);
  var atIdx = -1;
  for (var i = before.length - 1; i >= 0; i--) {
    var code = before.charCodeAt(i);
    var isLetterDigitUnder = (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57) || (code === 95);
    if (isLetterDigitUnder) continue;
    if (before.charAt(i) === '@') { atIdx = i; break; }
    break;
  }
  if (atIdx === -1) { hnMentionHide(); return; }
  var newBefore = before.substring(0, atIdx) + '@' + handle + ' ';
  el.value = newBefore + after;
  el.focus();
  el.setSelectionRange(newBefore.length, newBefore.length);
  hnMentionHide();
  if (el.id === 'hn-textarea') hnUpdateChar();
}

function hnMentionKey(e, el) {
  var drop = document.getElementById('hn-mention-drop');
  if (drop.style['display'] === 'none') return;
  var items = drop.querySelectorAll('.hn-mention-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    hn_mention_sel = Math.min(hn_mention_sel + 1, items.length - 1);
    for (var i = 0; i < items.length; i++) {
      if (i === hn_mention_sel) items[i].classList.add('hn-msel');
      else items[i].classList.remove('hn-msel');
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    hn_mention_sel = Math.max(hn_mention_sel - 1, 0);
    for (var i = 0; i < items.length; i++) {
      if (i === hn_mention_sel) items[i].classList.add('hn-msel');
      else items[i].classList.remove('hn-msel');
    }
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    if (hn_mention_sel >= 0 && items[hn_mention_sel]) {
      e.preventDefault();
      hnMentionPick(items[hn_mention_sel].getAttribute('data-handle'));
    }
  } else if (e.key === 'Escape') {
    hnMentionHide();
  }
}

function hnOpenShare(pid) {
  if (!hn_user) { hnOpenModal('auth'); return; }
  hn_share_pid = pid;
  var post = null;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === pid) { post = hn_posts[i]; break; } }
  if (!post) return;
  document.getElementById('hn-share-text').value = '';
  var sth = post.text.replace(/(#\w+)/g,'<span class="hn-hi">$1</span>');
  document.getElementById('hn-share-preview').innerHTML =
    '<div class="hn-shared-label">Post di '+hnEsc(post.authorName)+'</div>'+
    '<div class="hn-shared-author">'+hnEsc(post.authorName)+' <span style="color:#5b6577!important;">@'+hnEsc(post.authorHandle)+'</span></div>'+
    '<div class="hn-shared-text">'+sth+'</div>'+
    (post.imgUrl?'<img src="'+hnEsc(post.imgUrl)+'" style="max-width:100%;max-height:120px;border-radius:6px;margin-top:6px;object-fit:cover;display:block;" onerror="this.style.display=\'none\'">':'');
  document.getElementById('hn-share-err').style['display'] = 'none';
  hnOpenModal('share');
}

function hnDoShare() {
  if (!hn_user || !hn_share_pid) return;
  var orig = null;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === hn_share_pid) { orig = hn_posts[i]; break; } }
  if (!orig) return;
  var text = document.getElementById('hn-share-text').value.trim();
  var btn = document.querySelector('#hn-modal-share .hn-dbtn');
  btn.disabled = true; btn.textContent = '...';
  orig.shares = (orig.shares || 0) + 1;
  var newPost = {
    id: String(Date.now()),
    authorId: hn_user.id, authorName: hn_user.name,
    authorHandle: hn_user.handle, authorColor: hn_user.color,
    authorAvatar: hn_user.avatar || '', authorRank: hn_user.rank,
    text: text, imgUrl: '', likes: [], comments: [],
    sharedPost: {
      id: orig.id, authorId: orig.authorId,
      authorName: orig.authorName, authorHandle: orig.authorHandle,
      text: orig.text, imgUrl: orig.imgUrl || ''
    },
    createdAt: new Date().toISOString()
  };
  hn_posts.unshift(newPost);
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts},
    function() {
      hnCloseModal('share'); hnRenderFeed(); hnRenderSidebar(); btn.disabled=false; btn.textContent='Condividi';
      if (orig.authorId !== hn_user.id) hnCreateNotif(orig.authorId,'share',orig.id,orig.text);
      if (text) hnNotifMentions(text,newPost.id,text);
    },
    function() { hn_posts.shift(); orig.shares--; hnShowErr('hn-share-err','Errore nella condivisione. Riprova.'); btn.disabled=false; btn.textContent='Condividi'; }
  );
}

function hnToggleReplies(cid) {
  var el = document.getElementById('hn-rep-'+cid);
  if (!el) return;
  if (el.classList.contains('hn-open')) el.classList.remove('hn-open');
  else el.classList.add('hn-open');
}

function hnSubmitReply(pid, commentIndex) {
  if (!hn_user) { hnOpenModal('auth'); return; }
  var cid = pid + '_' + commentIndex;
  var inp = document.getElementById('hn-ri-'+cid);
  if (!inp) return;
  var text = inp.value.trim(); if (!text) return;
  var post = null;
  for (var i = 0; i < hn_posts.length; i++) { if (hn_posts[i].id === pid) { post = hn_posts[i]; break; } }
  if (!post || !post.comments || !post.comments[commentIndex]) return;
  var comment = post.comments[commentIndex];
  if (!comment.replies) comment.replies = [];
  var reply = {
    id: String(Date.now()),
    authorId: hn_user.id, authorName: hn_user.name,
    authorHandle: hn_user.handle, authorColor: hn_user.color,
    authorAvatar: hn_user.avatar || '',
    text: text, createdAt: new Date().toISOString()
  };
  comment.replies.push(reply);
  hnPUT(hn_api+'/'+hn_bin_post, {posts:hn_posts},
    function() {
      hnRenderFeed();
      setTimeout(function() {
        var cs = document.getElementById('hn-cs-'+pid);
        if (cs) cs.classList.add('hn-open');
        var rep = document.getElementById('hn-rep-'+cid);
        if (rep) rep.classList.add('hn-open');
      }, 50);
    },
    function() { comment.replies.pop(); alert('Errore nel salvataggio della risposta.'); }
  );
}

hnInit();
setInterval(function() {
  if (!hn_user) return;
  hnGET(hn_api+'/'+hn_bin_notif+'/latest',
    function(d) {
      hn_notifs = (d&&d.record&&d.record.notifications) ? d.record.notifications : [];
      hnUpdateBadge();
    },
    function() {}
  );
}, 60000);
