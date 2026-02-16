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

  useEffect(() => {
    fetchDossiers();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }

    setCreating(true);
    try {
      await dossiersApi.create({ title: newTitle, description: newDescription });
      toast.success('Dossier créé avec succès');
      setCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      fetchDossiers();
    } catch (error) {
      toast.error('Erreur lors de la création du dossier');
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
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
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
      </div>

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
