import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import api from './api';

function Layout({ user, setUser, children }) {
  const navigate = useNavigate();
  const links = useMemo(() => {
    const base = [{ to: '/dashboard', label: 'Dashboard' }, { to: '/articles', label: 'Articles' }, { to: '/bookmarks', label: 'Bookmarks' }];
    if (user && ['ADMIN', 'EDITOR'].includes(user.role)) base.push({ to: '/sources', label: 'Sources' });
    if (user && user.role === 'ADMIN') {
      base.push({ to: '/audit', label: 'Audit Logs' });
      base.push({ to: '/users', label: 'Users' });
    }
    return base;
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">NewsOps Studio</h1>
          <p className="text-sm text-slate-300">Real-time news aggregator DevOps app</p>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm">{user.name} ({user.role})</span>}
          <button className="bg-red-500 px-4 py-2 rounded" onClick={() => { localStorage.clear(); setUser(null); navigate('/login'); }}>Logout</button>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 p-4">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-white rounded-xl shadow p-4 h-fit">
          <nav className="space-y-2">
            {links.map(link => (
              <Link key={link.to} className="block px-3 py-2 rounded bg-slate-50 hover:bg-slate-100" to={link.to}>{link.label}</Link>
            ))}
          </nav>
        </aside>
        <main className="col-span-12 md:col-span-9 lg:col-span-10">{children}</main>
      </div>
    </div>
  );
}

function Login({ setUser }) {
  const [email, setEmail] = useState('admin@newsops.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form className="bg-white rounded-2xl shadow p-8 w-full max-w-md space-y-4" onSubmit={submit}>
        <h2 className="text-2xl font-bold">Login</h2>
        <p className="text-sm text-slate-600">Use any of the seeded demo credentials.</p>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <input className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button className="w-full bg-slate-900 text-white rounded px-4 py-2">Login</button>
      </form>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/dashboard/stats').then(res => setData(res.data)); }, []);
  if (!data) return <div>Loading dashboard...</div>;
  const cards = [
    ['Total Articles', data.totals.articleCount],
    ['Published Articles', data.totals.publishedCount],
    ['Sources', data.totals.sourceCount],
    ['Comments', data.totals.commentCount],
    ['Bookmarks', data.totals.bookmarkCount]
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl shadow p-4">
            <div className="text-slate-500 text-sm">{label}</div>
            <div className="text-3xl font-bold mt-2">{value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="text-lg font-semibold mb-3">Latest Articles</h3>
        <div className="space-y-3">
          {data.latestArticles.map(article => (
            <div key={article.id} className="border rounded-lg p-3">
              <div className="font-semibold">{article.title}</div>
              <div className="text-sm text-slate-600">{article.category} • {article.source.name} • {article.author.name}</div>
              <div className="text-sm mt-1">{article.summary}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Articles({ user }) {
  const [articles, setArticles] = useState([]);
  const [comments, setComments] = useState({});
  const [form, setForm] = useState({ title: '', summary: '', content: '', category: 'Technology', sourceId: 1, tags: 'news,update', status: 'DRAFT', imageUrl: '' });
  const canManage = ['ADMIN', 'EDITOR'].includes(user.role);

  const load = async () => {
    const endpoint = localStorage.getItem('token') ? '/articles' : '/articles/public';
    const res = await api.get(endpoint);
    setArticles(res.data);
  };

  useEffect(() => { load(); }, []);

  const createArticle = async (e) => {
    e.preventDefault();
    await api.post('/articles', { ...form, sourceId: Number(form.sourceId), tags: form.tags.split(',').map(t => t.trim()) });
    setForm({ title: '', summary: '', content: '', category: 'Technology', sourceId: 1, tags: 'news,update', status: 'DRAFT', imageUrl: '' });
    load();
  };

  const addBookmark = async (id) => {
    await api.post(`/bookmarks/${id}`);
    alert('Bookmarked');
  };

  const addComment = async (articleId) => {
    const content = comments[articleId];
    if (!content) return;
    await api.post(`/comments/${articleId}`, { content });
    setComments(prev => ({ ...prev, [articleId]: '' }));
    load();
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <form className="bg-white rounded-xl shadow p-4 grid md:grid-cols-2 gap-3" onSubmit={createArticle}>
          <h3 className="md:col-span-2 text-lg font-semibold">Create Article</h3>
          <input className="border rounded px-3 py-2" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Summary" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
          <textarea className="border rounded px-3 py-2 md:col-span-2" rows="4" placeholder="Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Source ID" value={form.sourceId} onChange={e => setForm({ ...form, sourceId: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Tags comma separated" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
          <select className="border rounded px-3 py-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option>DRAFT</option>
            <option>PUBLISHED</option>
            <option>ARCHIVED</option>
          </select>
          <input className="border rounded px-3 py-2" placeholder="Image URL optional" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
          <button className="bg-slate-900 text-white rounded px-4 py-2 md:col-span-2">Create</button>
        </form>
      )}

      <div className="space-y-4">
        {articles.map(article => (
          <div key={article.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{article.title}</h3>
                <div className="text-sm text-slate-600">{article.category} • {article.source?.name} • {article.status}</div>
              </div>
              {user && <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => addBookmark(article.id)}>Bookmark</button>}
            </div>
            <p className="mt-2 text-slate-700">{article.summary}</p>
            <p className="mt-2 text-sm">{article.content}</p>
            <div className="mt-3 text-xs text-slate-500">Tags: {article.tags?.join(', ')}</div>
            {user && (
              <div className="mt-4 border-t pt-4">
                <div className="font-semibold text-sm mb-2">Add Comment</div>
                <div className="flex gap-2">
                  <input className="border rounded px-3 py-2 flex-1" value={comments[article.id] || ''} onChange={e => setComments(prev => ({ ...prev, [article.id]: e.target.value }))} placeholder="Write a comment" />
                  <button className="bg-slate-900 text-white px-4 py-2 rounded" onClick={() => addComment(article.id)}>Post</button>
                </div>
                <div className="mt-3 space-y-2">
                  {(article.comments || []).map(comment => (
                    <div key={comment.id} className="bg-slate-50 rounded p-2 text-sm">{comment.content}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Sources({ user }) {
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState({ name: '', url: '', category: '', reliability: 4 });
  const canManage = ['ADMIN', 'EDITOR'].includes(user.role);
  const load = async () => setSources((await api.get('/sources')).data);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/sources', { ...form, reliability: Number(form.reliability) });
    setForm({ name: '', url: '', category: '', reliability: 4 });
    load();
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <form className="bg-white rounded-xl shadow p-4 grid md:grid-cols-4 gap-3" onSubmit={submit}>
          <input className="border rounded px-3 py-2" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="URL" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Reliability 1-5" value={form.reliability} onChange={e => setForm({ ...form, reliability: e.target.value })} />
          <button className="bg-slate-900 text-white rounded px-4 py-2 md:col-span-4">Add Source</button>
        </form>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sources.map(source => (
          <div key={source.id} className="bg-white rounded-xl shadow p-4">
            <div className="font-semibold">{source.name}</div>
            <div className="text-sm text-slate-600">{source.category}</div>
            <div className="text-sm mt-2 break-all">{source.url}</div>
            <div className="text-sm mt-2">Reliability: {source.reliability}/5</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get('/audit/logs').then(res => setLogs(res.data)); }, []);
  return (
    <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
      <h3 className="text-lg font-semibold mb-3">Audit Logs</h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b">
              <td className="py-2">{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.user?.email}</td>
              <td>{log.action}</td>
              <td>{log.entity}</td>
              <td>{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get('/users').then(res => setUsers(res.data)); }, []);
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Users</h3>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {users.map(user => (
          <div key={user.id} className="border rounded-lg p-3">
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm">{user.email}</div>
            <div className="text-sm text-slate-600 mt-1">{user.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bookmarks() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get('/bookmarks').then(res => setItems(res.data)); }, []);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-xl shadow p-4">
          <div className="font-semibold">{item.article.title}</div>
          <div className="text-sm text-slate-600">{item.article.category} • {item.article.source?.name}</div>
          <div className="mt-2 text-sm">{item.article.summary}</div>
        </div>
      ))}
    </div>
  );
}

function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  return (
    <Routes>
      <Route path="/login" element={<Login setUser={setUser} />} />
      <Route path="/*" element={
        <ProtectedRoute user={user}>
          <Layout user={user} setUser={setUser}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/articles" element={<Articles user={user} />} />
              <Route path="/sources" element={<Sources user={user} />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/users" element={<Users />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
