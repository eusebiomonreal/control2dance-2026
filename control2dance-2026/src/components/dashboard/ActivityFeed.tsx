import { useStore } from '@nanostores/react';
import { $activities } from '../../stores/dashboardStore';
import { LogIn, LogOut, ShoppingCart, Download, Key, User, Activity as ActivityIcon } from 'lucide-react';

interface ActivityFeedProps {
  limit?: number;
  showViewAll?: boolean;
}

const activityIcons = {
  login: LogIn,
  logout: LogOut,
  purchase: ShoppingCart,
  download: Download,
  password_change: Key,
  profile_update: User,
};

const activityLabels = {
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  purchase: 'Compra realizada',
  download: 'Descarga',
  password_change: 'Cambio de contraseña',
  profile_update: 'Perfil actualizado',
};

const activityColors = {
  login: 'bg-blue-500/10 text-blue-400',
  logout: 'bg-zinc-500/10 text-zinc-400',
  purchase: 'bg-green-500/10 text-green-400',
  download: 'bg-indigo-500/10 text-indigo-400',
  password_change: 'bg-yellow-500/10 text-yellow-400',
  profile_update: 'bg-purple-500/10 text-purple-400',
};

export default function ActivityFeed({ limit, showViewAll = false }: ActivityFeedProps) {
  const activities = useStore($activities);
  const displayActivities = limit ? activities.slice(0, limit) : activities;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  if (activities.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <ActivityIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Sin actividad</h3>
        <p className="text-zinc-400">Tu actividad reciente aparecerá aquí</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Actividad Reciente</h2>
        {showViewAll && activities.length > (limit || 0) && (
          <a
            href="/dashboard/activity"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Ver todo →
          </a>
        )}
      </div>

      <div className="divide-y divide-zinc-800">
        {displayActivities.map((activity) => {
          const Icon = activityIcons[activity.action as keyof typeof activityIcons] || ActivityIcon;
          const label = activityLabels[activity.action as keyof typeof activityLabels] || activity.action;
          const colorClass = activityColors[activity.action as keyof typeof activityColors] || 'bg-zinc-500/10 text-zinc-400';

          return (
            <div key={activity.id} className="p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{label}</p>
                {activity.description && (
                  <p className="text-sm text-zinc-400 truncate">{activity.description}</p>
                )}
                {activity.metadata?.product_name && (
                  <p className="text-sm text-zinc-400">{activity.metadata.product_name}</p>
                )}
                {activity.metadata?.order_total && (
                  <p className="text-sm text-green-400">€{activity.metadata.order_total}</p>
                )}
              </div>

              <span className="text-sm text-zinc-500 flex-shrink-0">
                {formatTimeAgo(activity.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
