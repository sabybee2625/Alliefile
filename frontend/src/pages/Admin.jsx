import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import {
  ShieldCheck, Users, Receipt, Ticket, BarChart3, Loader2, Trash2, Plus, RefreshCw,
} from 'lucide-react';

const AdminPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    adminApi.me()
      .then(() => { setIsAdmin(true); setLoading(false); })
      .catch(() => { setIsAdmin(false); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto py-20 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2" data-testid="admin-denied-title">Accès refusé</h1>
          <p className="text-slate-600 mb-6">Cette zone est réservée aux administrateurs d'AlliéFile.</p>
          <Button onClick={() => navigate('/dashboard')} data-testid="admin-back-btn">Retour au tableau de bord</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8" data-testid="admin-page">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-7 h-7 text-slate-900" />
          <h1 className="text-2xl font-bold text-slate-900">Administration AlliéFile</h1>
        </div>

        <Tabs defaultValue="stats">
          <TabsList>
            <TabsTrigger value="stats" data-testid="admin-tab-stats"><BarChart3 className="w-4 h-4 mr-1" />Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="users" data-testid="admin-tab-users"><Users className="w-4 h-4 mr-1" />Utilisateurs</TabsTrigger>
            <TabsTrigger value="promos" data-testid="admin-tab-promos"><Ticket className="w-4 h-4 mr-1" />Codes promo</TabsTrigger>
            <TabsTrigger value="txs" data-testid="admin-tab-txs"><Receipt className="w-4 h-4 mr-1" />Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="stats"><StatsPanel /></TabsContent>
          <TabsContent value="users"><UsersPanel /></TabsContent>
          <TabsContent value="promos"><PromosPanel /></TabsContent>
          <TabsContent value="txs"><TransactionsPanel /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

const StatsPanel = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    adminApi.stats()
      .then((r) => setStats(r.data))
      .catch(() => toast.error('Erreur lors du chargement des stats'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  if (!stats) return null;

  const cards = [
    { label: 'Utilisateurs', value: stats.total_users, testid: 'admin-stat-users' },
    { label: 'Dossiers', value: stats.total_dossiers, testid: 'admin-stat-dossiers' },
    { label: 'Pièces', value: stats.total_pieces, testid: 'admin-stat-pieces' },
    { label: 'Revenu (€)', value: stats.total_revenue_eur.toFixed(2), testid: 'admin-stat-revenue' },
    { label: 'Paiements OK', value: stats.transactions_paid, testid: 'admin-stat-paid' },
    { label: 'En attente', value: stats.transactions_pending, testid: 'admin-stat-pending' },
    { label: 'Codes promo', value: stats.promo_codes_count, testid: 'admin-stat-promos' },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Métriques clés</h2>
        <Button variant="outline" size="sm" onClick={load} data-testid="admin-stats-refresh">
          <RefreshCw className="w-4 h-4 mr-1" />Actualiser
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
              <div className="text-2xl font-bold text-slate-900 mt-1" data-testid={c.testid}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Répartition par plan</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(stats.users_by_plan || {}).map(([plan, count]) => (
            <Badge key={plan} variant="outline" data-testid={`admin-plan-${plan}`}>{plan}: {count}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const UsersPanel = () => {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.listUsers({ q, limit: 100 })
      .then((r) => setUsers(r.data))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const changePlan = async (userId, plan) => {
    try {
      await adminApi.updateUserPlan(userId, plan);
      toast.success('Plan mis à jour');
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Rechercher par email / nom"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          data-testid="admin-users-search"
        />
        <Button onClick={load} data-testid="admin-users-search-btn">Chercher</Button>
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid={`admin-user-row-${u.id}`}>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.name}</TableCell>
                  <TableCell><Badge>{u.plan}</Badge></TableCell>
                  <TableCell className="text-xs text-slate-500">{u.plan_status || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-500">{(u.created_at || '').slice(0, 10)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => changePlan(u.id, 'free')} data-testid={`admin-user-${u.id}-free`}>Free</Button>
                      <Button size="sm" variant="outline" onClick={() => changePlan(u.id, 'essentiel')} data-testid={`admin-user-${u.id}-essentiel`}>Essentiel</Button>
                      <Button size="sm" variant="outline" onClick={() => changePlan(u.id, 'pro')} data-testid={`admin-user-${u.id}-pro`}>Pro</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">Aucun utilisateur</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

const PromosPanel = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: '', discount_percent: '', discount_amount: '', max_uses: -1 });

  const load = () => {
    setLoading(true);
    adminApi.listPromos()
      .then((r) => setPromos(r.data.promos || []))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.code) { toast.error('Code requis'); return; }
    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_percent: form.discount_percent ? parseInt(form.discount_percent, 10) : null,
      discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : null,
      max_uses: parseInt(form.max_uses, 10) || -1,
    };
    try {
      await adminApi.createPromo(payload);
      toast.success('Code créé');
      setForm({ code: '', discount_percent: '', discount_amount: '', max_uses: -1 });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    }
  };

  const remove = async (code) => {
    try {
      await adminApi.deletePromo(code);
      toast.success('Code supprimé');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Créer un code promo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="admin-promo-code" />
          </div>
          <div>
            <Label>% remise</Label>
            <Input type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} data-testid="admin-promo-percent" />
          </div>
          <div>
            <Label>Montant (€)</Label>
            <Input type="number" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} data-testid="admin-promo-amount" />
          </div>
          <Button onClick={create} data-testid="admin-promo-create"><Plus className="w-4 h-4 mr-1" />Créer</Button>
        </CardContent>
      </Card>

      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Montant (€)</TableHead>
                <TableHead>Usages</TableHead>
                <TableHead>Max</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.map((p) => (
                <TableRow key={p.id} data-testid={`admin-promo-row-${p.code}`}>
                  <TableCell className="font-mono">{p.code}</TableCell>
                  <TableCell>{p.discount_percent || '—'}</TableCell>
                  <TableCell>{p.discount_amount || '—'}</TableCell>
                  <TableCell>{p.uses || 0}</TableCell>
                  <TableCell>{p.max_uses === -1 ? '∞' : p.max_uses}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => remove(p.code)} data-testid={`admin-promo-delete-${p.code}`}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {promos.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">Aucun code</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

const TransactionsPanel = () => {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.listTransactions({ limit: 100 })
      .then((r) => setTxs(r.data.transactions || []))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="mt-6">
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.map((t) => (
                <TableRow key={t.id} data-testid={`admin-tx-row-${t.id}`}>
                  <TableCell className="text-xs">{(t.created_at || '').slice(0, 16).replace('T', ' ')}</TableCell>
                  <TableCell className="text-sm">{t.user_email}</TableCell>
                  <TableCell><Badge variant="outline">{t.plan_id}</Badge></TableCell>
                  <TableCell className="text-xs">{t.billing_period}</TableCell>
                  <TableCell className="text-sm">{t.amount} {t.currency?.toUpperCase()}</TableCell>
                  <TableCell>
                    <Badge className={t.status === 'paid' ? 'bg-emerald-500' : t.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'}>
                      {t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {txs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">Aucune transaction</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminPage;
