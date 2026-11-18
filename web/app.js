// The admin page. It only talks to the API; all text is set with textContent, never as HTML.

const $ = (id) => document.getElementById(id);

const api = async (method, path, body) => {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  return { ok: res.ok, status: res.status, data };
};

let isAdmin = false;

const show = (signedIn) => {
  $('sign-in').hidden = signedIn;
  $('findings').hidden = !signedIn;
  $('keys').hidden = !signedIn;
  $('account').hidden = !signedIn;
  // Hiding buttons is only for comfort: the API itself refuses viewers with 403.
  $('new-key').hidden = !isAdmin;
  $('viewer-note').hidden = isAdmin;
  $('new-key-value').hidden = true;
};

const cell = (main, sub) => {
  const td = document.createElement('td');
  const strong = document.createElement('div');
  strong.textContent = main;
  td.append(strong);
  if (sub) {
    const small = document.createElement('div');
    small.className = 'sub';
    small.textContent = sub;
    td.append(small);
  }
  return td;
};

const renderFindings = (findings) => {
  const rows = findings.map((f) => {
    const tr = document.createElement('tr');
    const rule = f.why.byDefault ? 'Not allowed by any rule' : `Rule "${f.why.ruleId}"`;
    tr.append(
      cell(f.who.user, `${f.who.agent} in ${f.who.workspace}`),
      cell(f.what.destination, f.what.program),
      cell(rule, f.why.message),
      cell(String(f.count)),
      cell(new Date(f.lastSeen).toLocaleString()),
    );
    return tr;
  });
  $('rows').replaceChildren(...rows);
  $('empty').hidden = findings.length > 0;
};

const loadFindings = async () => {
  const res = await api('GET', '/findings');
  if (res.status === 401) return show(false);
  renderFindings(res.data);
};

const revokeButton = (key) => {
  const td = document.createElement('td');
  if (!isAdmin) return td;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Revoke';
  button.addEventListener('click', async () => {
    if (!confirm(`Revoke "${key.name}"? Agents using it will be refused at once.`)) return;
    const res = await api('DELETE', `/agent-keys/${key.id}`);
    $('key-error').textContent = res.ok ? '' : res.data.message;
    await loadKeys();
  });
  td.append(button);
  return td;
};

const loadKeys = async () => {
  const res = await api('GET', '/agent-keys');
  if (res.status === 401) return show(false);
  const rows = res.data.map((key) => {
    const tr = document.createElement('tr');
    tr.append(
      cell(key.name),
      cell(`${key.prefix}…`),
      cell(new Date(key.createdAt).toLocaleString()),
      revokeButton(key),
    );
    return tr;
  });
  $('key-rows').replaceChildren(...rows);
};

const start = async () => {
  const me = await api('GET', '/sessions/current');
  if (!me.ok) return show(false);
  isAdmin = me.data.role === 'admin';
  $('who').textContent = `${me.data.email} (${me.data.tenant}, ${me.data.role})`;
  show(true);
  await Promise.all([loadFindings(), loadKeys()]);
};

$('new-key').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = new FormData(event.target).get('name');
  const res = await api('POST', '/agent-keys', { name });
  $('key-error').textContent = res.ok ? '' : [res.data.message].flat().join(' ');
  if (!res.ok) return;
  event.target.reset();
  // The only time the key is visible: we store just its hash.
  $('new-key-value').textContent =
    `New key: ${res.data.key}  (copy it now, it won't be shown again)`;
  $('new-key-value').hidden = false;
  await loadKeys();
});

$('sign-in').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const res = await api('POST', '/sessions', {
    email: form.get('email'),
    password: form.get('password'),
  });
  $('sign-in-error').textContent = res.ok ? '' : res.data.message;
  if (res.ok) {
    event.target.reset();
    await start();
  }
});

$('sign-out').addEventListener('click', async () => {
  await api('DELETE', '/sessions/current');
  show(false);
});

$('refresh').addEventListener('click', loadFindings);

start();
