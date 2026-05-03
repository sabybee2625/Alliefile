import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Users, 
  Trash2, 
  ShieldAlert, 
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  // Check if user is admin (hardcoded or via ADMIN_EMAILS logic)
  const isAdmin = user?.email === 'sabrina.harmin@gmail.com' || user?.is_admin;

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Note: You'll need to implement GET /api/admin/users in backend if not exists
      // For now, we assume it exists or we handle the error
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors de la récupération des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    const confirmDelete = window.confirm(
      `ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement le compte de ${userEmail} ?\n\n` +
      `Cette action est IRREVERSIBLE et supprimera :\n` +
      `- Le compte utilisateur\n` +
      `- Tous ses dossiers\n` +
      `- Toutes ses pièces et fichiers stockés\n\n` +
      `Conformité RGPD : Toutes les données seront effacées.`
    );

    if (!confirmDelete) return;

    setIsDeleting(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success(`Utilisateur ${userEmail} supprimé avec succès`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(null);
    }
  };

  if (authLoading) return <div className="p-8 text-center">Chargement...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="text-red-600" />
              Administration Alliefile
            </h1>
            <p className="text-slate-500">Gérez les utilisateurs et la conformité RGPD</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un email..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={fetchUsers}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <h2 className="font-semibold text-slate-800">Utilisateurs ({filteredUsers.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Utilisateur</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Inscription</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                      Chargement des utilisateurs...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{u.email}</div>
                        <div className="text-xs text-slate-400 font-mono">{u.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.plan === 'premium' ? 'bg-purple-100 text-purple-700' :
                          u.plan === 'standard' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {u.plan?.toUpperCase() || 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          disabled={isDeleting === u.id || u.email === user.email}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          {isDeleting === u.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Zone de Danger - Conformité RGPD</p>
            <p>La suppression d'un compte est immédiate et définitive. Toutes les pièces jointes stockées dans GridFS seront également supprimées pour respecter le droit à l'oubli.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
