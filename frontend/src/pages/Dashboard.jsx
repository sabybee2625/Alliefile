import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { dossiersApi, userApi } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Disclaimer } from './Legal';
import {
  Plus,
  FolderOpen,
  FileText,
  Loader2,
  Trash2,
  MoreVertical,
  Calendar,
  Crown,
  Zap,
  TrendingUp,
  HardDrive,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// Beta Code Section Component
const BetaCodeSection = ({ onActivated }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await userApi.activateBetaCode(code.trim());
      toast.success('Code activé ! Vous avez maintenant un accès Premium.');
      setCode('');
      onActivated();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <p className="text-sm font-medium text-slate-700 mb-2">Code d'accès (association/test)</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez votre code"
          className="flex-1 h-9"
          onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
        />
        <Button 
          onClick={handleActivate} 
          disabled={loading || !code.trim()}
          size="sm"
          className="h-9"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activer'}
        </Button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fetchDossiers = async () => {
    try {
      const res = await dossiersApi.list();
      setDossiers(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await userApi.getStats();
      setUserStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchDossiers();
    fetchUserStats();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }
    
    // Check plan limits
    if (userStats?.plan_limits) {
      const maxDossiers = userStats.plan_limits.max_dossiers;
      if (maxDossiers !== -1 && dossiers.length >= maxDossiers) {
        toast.error(`Limite atteinte (${maxDossiers} dossiers). Passez à un plan supérieur.`);
        navigate('/pricing');
        return;
      }
    }

    setCreating(true);
    try {
      await dossiersApi.create({ title: newTitle, description: newDescription });
      toast.success('Dossier créé avec succès');
      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      fetchDossiers();
      fetchUserStats();
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Limite de plan atteinte. Passez à un plan supérieur.');
        navigate('/pricing');
      } else {
        toast.error('Erreur lors de la création du dossier');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await dossiersApi.delete(deleteTarget);
      toast.success('Dossier supprimé');
      setDeleteTarget(null);
      fetchDossiers();
      fetchUserStats();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = async (immediate = false) => {
    setDeletingAccount(true);
    try {
      const res = await userApi.deleteAccount(immediate);
      if (immediate) {
        toast.success('Compte supprimé définitivement');
        logout();
        navigate('/login');
      } else {
        toast.success('Suppression programmée dans 7 jours. Reconnectez-vous pour annuler.');
        setDeleteAccountOpen(false);
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression du compte');
    } finally {
      setDeletingAccount(false);
    }
  };

  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case 'premium': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'standard': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const getPlanIcon = (plan) => {
    switch (plan) {
      case 'premium': return <Crown className="w-4 h-4" />;
      case 'standard': return <Zap className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Plan Status Banner */}
        {userStats && (
          <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className={`${getPlanBadgeColor(userStats.plan)} flex items-center gap-1`}>
                    {getPlanIcon(userStats.plan)}
                    Plan {userStats.plan.charAt(0).toUpperCase() + userStats.plan.slice(1)}
                  </Badge>
                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <FolderOpen className="w-4 h-4" />
                      {userStats.total_dossiers}
                      {userStats.plan_limits.max_dossiers !== -1 && 
                        ` / ${userStats.plan_limits.max_dossiers}`
                      } dossiers
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {userStats.total_pieces}
                      {userStats.plan_limits.max_total_pieces !== -1 && 
                        ` / ${userStats.plan_limits.max_total_pieces}`
                      } pièces
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-4 h-4" />
                      {userStats.storage_used_mb.toFixed(1)} Mo
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 className="w-4 h-4" />
                      {userStats.active_share_links} liens actifs
                    </span>
                  </div>
                </div>
                {userStats.plan === 'free' && (
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="bg-blue-600 hover:bg-blue-700 rounded-sm"
                    size="sm"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Passer à Standard
                  </Button>
                )}
                {userStats.plan === 'standard' && (
                  <Button
                    onClick={() => navigate('/pricing')}
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 rounded-sm"
                    size="sm"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Passer à Premium
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Beta Access Code */}
        {userStats && userStats.plan === 'free' && (
          <BetaCodeSection onActivated={fetchUserStats} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900">
              Mes Dossiers
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gérez vos dossiers juridiques et leurs pièces
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                data-testid="create-dossier-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau dossier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">Créer un dossier</DialogTitle>
                <DialogDescription>
                  Créez un nouveau dossier pour organiser vos pièces juridiques
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du dossier</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Affaire Dupont c/ Martin"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="rounded-sm"
                    data-testid="dossier-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea
                    id="description"
                    placeholder="Description du dossier..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="rounded-sm resize-none"
                    rows={3}
                    data-testid="dossier-description-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-sm"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                  data-testid="confirm-create-dossier"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Créer'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dossiers Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : dossiers.length === 0 ? (
          <Card className="border-slate-200 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-heading font-semibold text-slate-900 mb-1">
                Aucun dossier
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Créez votre premier dossier pour commencer
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                data-testid="empty-create-dossier-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un dossier
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dossiers.map((dossier, index) => (
              <Card
                key={dossier.id}
                className="border-slate-200 card-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Link to={`/dossier/${dossier.id}`} data-testid={`dossier-link-${index}`}>
                      <CardTitle className="font-heading text-lg hover:text-sky-700 transition-colors cursor-pointer">
                        {dossier.title}
                      </CardTitle>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`dossier-menu-${index}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(dossier.id)}
                          className="text-red-600 cursor-pointer"
                          data-testid={`delete-dossier-${index}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {dossier.description && (
                    <CardDescription className="line-clamp-2">
                      {dossier.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{dossier.piece_count} pièce{dossier.piece_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateTime(dossier.created_at).split(' ').slice(0, 3).join(' ')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <Disclaimer className="mt-6" />
        
        {/* Legal Footer */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-8 pt-4 border-t border-slate-200">
          <Link to="/cgu" className="hover:text-slate-900">Conditions Générales</Link>
          <Link to="/privacy" className="hover:text-slate-900">Politique de Confidentialité</Link>
          <Link to="/pricing" className="hover:text-slate-900">Tarifs</Link>
          <button
            onClick={() => setDeleteAccountOpen(true)}
            className="text-red-500 hover:text-red-700"
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Supprimer définitivement votre compte ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Cette action est <strong>irréversible</strong>. Seront supprimés :</p>
              <ul className="list-disc pl-4 text-sm">
                <li>Tous vos dossiers et pièces</li>
                <li>Tous vos fichiers uploadés</li>
                <li>Tous vos liens de partage</li>
                <li>Votre compte et vos données personnelles</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              className="bg-red-600 hover:bg-red-700 rounded-sm"
            >
              {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer mon compte'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les pièces du dossier seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 rounded-sm"
              data-testid="confirm-delete-dossier"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Dashboard;
