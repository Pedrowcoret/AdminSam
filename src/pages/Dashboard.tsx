import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { useNotification } from '../contexts/NotificationContext';
import { revendaService } from '../services/revendaService';
import { Users, Activity, Server, TrendingUp, UserPlus, UserX, Clock, Database } from 'lucide-react';

interface DashboardStats {
  totalRevendas: number;
  revendasAtivas: number;
  revendasSuspensas: number;
  revendasExpiradas: number;
  totalStreamings: number;
  totalEspectadores: number;
  espacoUsado: number;
  totalBitrate: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await revendaService.getStats();
      setStats(data);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível carregar as estatísticas.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock size={16} />
          <span>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Revendas</p>
              <p className="text-3xl font-bold">{formatNumber(stats?.totalRevendas || 0)}</p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
              <Users size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Revendas Ativas</p>
              <p className="text-3xl font-bold">{formatNumber(stats?.revendasAtivas || 0)}</p>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
              <UserPlus size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Revendas Suspensas</p>
              <p className="text-3xl font-bold">{formatNumber(stats?.revendasSuspensas || 0)}</p>
            </div>
            <div className="bg-yellow-400 bg-opacity-30 rounded-full p-3">
              <UserX size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Streamings</p>
              <p className="text-3xl font-bold">{formatNumber(stats?.totalStreamings || 0)}</p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
              <Activity size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recursos Utilizados</h3>
            <Database className="text-gray-400" size={20} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total de Espectadores</span>
              <span className="font-semibold">{formatNumber(stats?.totalEspectadores || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Espaço Utilizado</span>
              <span className="font-semibold">{formatBytes((stats?.espacoUsado || 0) * 1024 * 1024)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bitrate Total</span>
              <span className="font-semibold">{formatNumber(stats?.totalBitrate || 0)} kbps</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Status das Revendas</h3>
            <TrendingUp className="text-gray-400" size={20} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Ativas</span>
              </div>
              <span className="font-semibold">{formatNumber(stats?.revendasAtivas || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Suspensas</span>
              </div>
              <span className="font-semibold">{formatNumber(stats?.revendasSuspensas || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Expiradas</span>
              </div>
              <span className="font-semibold">{formatNumber(stats?.revendasExpiradas || 0)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <UserPlus className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Nova Revenda</p>
                <p className="text-sm text-gray-600">Criar nova conta de revenda</p>
              </div>
            </div>
          </button>
          <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Activity className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Monitorar Sistema</p>
                <p className="text-sm text-gray-600">Verificar status dos serviços</p>
              </div>
            </div>
          </button>
          <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Server className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="font-medium">Gerenciar Servidores</p>
                <p className="text-sm text-gray-600">Configurar servidores de streaming</p>
              </div>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
};