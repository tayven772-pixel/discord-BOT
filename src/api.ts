import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type ApiResponse<T = unknown> = { data: T; status: number };

const SUPABASE_URL = 'https://hakkurhonparlcyxdvbw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MkCtZqaLtvIsaLKi0DGj9Q_fYSUjden';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

function cleanName(email: string, requested?: string) {
  const value = (requested || '').trim();
  return value || email.split('@')[0] || 'Coder';
}

async function clientForToken(token?: string): Promise<SupabaseClient> {
  if (!token) return supabase;
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function userFromToken(token?: string) {
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function signup(body: any) {
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const name = cleanName(email, body?.name);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, display_name: name },
      emailRedirectTo: window.location.origin + '/',
    },
  });
  if (error) return { ok: false, error: error.message };

  let session = data.session;
  let signedInUser = data.user;

  // Email confirmation is disabled for Meta, so signup should enter the site immediately.
  // If Supabase does not return a session for any reason, sign in with the same credentials.
  if (!session) {
    const retry = await supabase.auth.signInWithPassword({ email, password });
    if (retry.error || !retry.data.session || !retry.data.user) {
      return { ok: false, error: retry.error?.message || 'Your account was created, but automatic sign-in failed. Try logging in.' };
    }
    session = retry.data.session;
    signedInUser = retry.data.user;
  }

  if (!signedInUser) {
    return { ok: false, error: 'Your Meta account could not be opened.' };
  }

  return {
    ok: true,
    token: session.access_token,
    user: { email: signedInUser.email || email, name },
  };
}

async function login(body: any) {
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return { ok: false, error: error?.message || 'Email or password is incorrect.' };
  }
  const name = String(data.user.user_metadata?.name || data.user.user_metadata?.display_name || email.split('@')[0] || 'Coder');
  return {
    ok: true,
    token: data.session.access_token,
    user: { email: data.user.email || email, name },
  };
}

async function googleLogin(body: any) {
  const credential = String(body?.credential || '');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: credential,
  });
  if (error || !data.session || !data.user) {
    return { ok: false, error: error?.message || 'Google sign-in could not be completed.' };
  }
  const email = data.user.email || '';
  const name = String(data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0] || 'Coder');
  return {
    ok: true,
    token: data.session.access_token,
    user: { email, name },
  };
}

async function validate(body: any) {
  const user = await userFromToken(String(body?.token || ''));
  if (!user) return { ok: false, error: 'Session expired.' };
  const email = user.email || '';
  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || email.split('@')[0] || 'Coder');
  return { ok: true, user: { email, name } };
}

async function loadAccount(body: any) {
  const token = String(body?.token || '');
  const user = await userFromToken(token);
  if (!user) return { ok: false, error: 'Sign in required.' };

  const db = await clientForToken(token);
  const [{ data: profile, error: profileError }, { data: projects, error: projectError }] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    db.from('projects').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30),
  ]);

  if (profileError) return { ok: false, error: profileError.message };
  if (projectError) return { ok: false, error: projectError.message };

  return {
    ok: true,
    profile: profile ? {
      avatar: profile.avatar,
      language: profile.language,
      mode: profile.mode,
      appearance: profile.appearance,
      xp: profile.xp,
      streak: profile.streak,
      lastVisit: profile.last_visit,
      skills: profile.skills,
      completed: profile.completed,
    } : null,
    projects: (projects || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      files: p.files,
      activeFile: p.active_file,
      updatedAt: p.updated_at,
    })),
  };
}

async function saveAccount(body: any) {
  const token = String(body?.token || '');
  const user = await userFromToken(token);
  if (!user) return { ok: false, error: 'Sign in required.' };
  const p = body?.profile || {};
  const db = await clientForToken(token);
  const record = {
    id: user.id,
    email: user.email || '',
    display_name: String(p.displayName || user.user_metadata?.name || ''),
    avatar: String(p.avatar || '🚀'),
    language: String(p.language || 'English'),
    mode: String(p.mode || 'Beginner'),
    appearance: p.appearance === 'light' ? 'light' : 'dark',
    xp: Math.max(0, Number(p.xp) || 0),
    streak: Math.max(0, Number(p.streak) || 0),
    last_visit: String(p.lastVisit || ''),
    skills: p.skills || {},
    completed: Array.isArray(p.completed) ? p.completed : [],
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('profiles').upsert(record, { onConflict: 'id' });
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function saveProject(body: any) {
  const token = String(body?.token || '');
  const user = await userFromToken(token);
  if (!user) return { ok: false, error: 'Sign in required.' };
  const project = body?.project || {};
  const id = body?.id ? String(body.id) : null;
  const db = await clientForToken(token);
  const record = {
    user_id: user.id,
    name: String(project.name || 'Untitled project').slice(0, 120),
    type: String(project.type || 'apps'),
    files: project.files || {},
    active_file: String(project.activeFile || ''),
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await db.from('projects').update(record).eq('id', id).eq('user_id', user.id);
    return error ? { ok: false, error: error.message } : { ok: true, id };
  }

  const { data, error } = await db.from('projects').insert(record).select('id').single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

async function deleteAccount(body: any) {
  if (body?.confirmation !== 'DELETE') return { ok: false, error: 'Type DELETE to confirm account deletion.' };
  const token = String(body?.token || '');
  const user = await userFromToken(token);
  if (!user) return { ok: false, error: 'Sign in required.' };
  const db = await clientForToken(token);
  const { error: projectsError } = await db.from('projects').delete().eq('user_id', user.id);
  if (projectsError) return { ok: false, error: projectsError.message };
  const { error: profileError } = await db.from('profiles').delete().eq('id', user.id);
  if (profileError) return { ok: false, error: profileError.message };
  await supabase.auth.signOut();
  return { ok: true };
}

async function getTheme() {
  const { data, error } = await supabase.from('site_theme').select('accent').eq('id', 1).maybeSingle();
  return error ? { ok: true, accent: '#328dff' } : { ok: true, accent: data?.accent || '#328dff' };
}

async function privacyInquiry(body: any) {
  const email = String(body?.email || '').trim();
  const message = String(body?.message || '').trim();
  const { error } = await supabase.from('privacy_inquiries').insert({ email, message });
  return error ? { ok: false, error: error.message } : { ok: true };
}

async function fallback(method: 'GET' | 'POST', url: string, body?: unknown) {
  const path = url.replace(/^\/api\//, '');
  const target = path === 'coach' ? '/api/coach' : '/api/proxy?path=' + encodeURIComponent(path);
  const response = await fetch(target, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('Meta backend returned an invalid response.'); }
  return { data, status: response.status };
}

async function request<T = unknown>(method: 'GET' | 'POST', url: string, body?: any): Promise<ApiResponse<T>> {
  let data: any;
  if (method === 'POST' && url === '/api/auth/signup') data = await signup(body);
  else if (method === 'POST' && url === '/api/auth/login') data = await login(body);
  else if (method === 'POST' && url === '/api/auth/google') data = await googleLogin(body);
  else if (method === 'POST' && url === '/api/auth/logout') {
    await supabase.auth.signOut();
    data = { ok: true };
  }
  else if (method === 'POST' && url === '/api/session/validate') data = await validate(body);
  else if (method === 'POST' && url === '/api/account/load') data = await loadAccount(body);
  else if (method === 'POST' && url === '/api/account/save') data = await saveAccount(body);
  else if (method === 'POST' && url === '/api/account/delete') data = await deleteAccount(body);
  else if (method === 'POST' && url === '/api/projects/save') data = await saveProject(body);
  else if (method === 'GET' && url === '/api/theme') data = await getTheme();
  else if (method === 'POST' && url === '/api/privacy/inquiry') data = await privacyInquiry(body);
  else return fallback(method, url, body) as Promise<ApiResponse<T>>;

  return { data: data as T, status: data?.ok === false ? 400 : 200 };
}

export const api = {
  get<T = unknown>(url: string) { return request<T>('GET', url); },
  post<T = unknown>(url: string, body?: unknown) { return request<T>('POST', url, body); },
};
