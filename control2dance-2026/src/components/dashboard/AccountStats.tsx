import { useStore } from '@nanostores/react';
import { $stats } from '../../stores/dashboardStore';
import { ShoppingBag, Euro, Download, Music } from 'lucide-react';

export default function AccountStats() {
  const stats = useStore($stats);

  const statCards = [
    {
      label: 'Pedidos',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-indigo-500/10 text-indigo-400',
    },
    {
      label: 'Total Gastado',
      value: `€${stats.totalSpent.toFixed(2)}`,
      icon: Euro,
      color: 'bg-green-500/10 text-green-400',
    },
    {
      label: 'Descargas',
      value: stats.totalDownloads,
      icon: Download,
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: 'Productos',
      value: stats.totalProducts,
      icon: Music,
      color: 'bg-purple-500/10 text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-zinc-400">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
