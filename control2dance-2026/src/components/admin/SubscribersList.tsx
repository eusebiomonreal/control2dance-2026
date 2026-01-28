import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Search, Loader2 } from 'lucide-react';

interface Subscriber {
    id: string;
    email: string;
    name: string | null;
    subscribed_at: string;
    source: string;
    ip_address: string | null;
    consent_given: boolean;
}

export default function SubscribersList() {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadSubscribers();
    }, []);

    const loadSubscribers = async () => {
        try {
            const { data, error } = await supabase
                .from('newsletter_subscribers')
                .select('*')
                .order('subscribed_at', { ascending: false });

            if (error) throw error;
            setSubscribers(data || []);
        } catch (err) {
            console.error('Error cargando suscriptores:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (subscribers.length === 0) return;

        // Headers
        const headers = ['Email', 'Nombre', 'Fecha Suscripción', 'Origen', 'IP', 'Consentimiento'];

        // Rows
        const rows = subscribers.map(sub => [
            sub.email,
            sub.name || '',
            new Date(sub.subscribed_at).toLocaleString(),
            sub.source,
            sub.ip_address || '',
            sub.consent_given ? 'Sí' : 'No'
        ]);

        // CSV Content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `suscriptores_newsletter_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredSubscribers = subscribers.filter(sub =>
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.name && sub.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar por email o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700"
                >
                    <Download className="w-4 h-4" />
                    Exportar CSV
                </button>
            </div>

            {/* Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-zinc-950 border-b border-zinc-800">
                                <th className="px-6 py-4 font-semibold text-zinc-300">Email</th>
                                <th className="px-6 py-4 font-semibold text-zinc-300">Nombre</th>
                                <th className="px-6 py-4 font-semibold text-zinc-300">Fecha</th>
                                <th className="px-6 py-4 font-semibold text-zinc-300">Origen</th>
                                <th className="px-6 py-4 font-semibold text-zinc-300">IP</th>
                                <th className="px-6 py-4 font-semibold text-zinc-300 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredSubscribers.length > 0 ? (
                                filteredSubscribers.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4 text-white font-medium">{sub.email}</td>
                                        <td className="px-6 py-4 text-zinc-400">{sub.name || '-'}</td>
                                        <td className="px-6 py-4 text-zinc-400">
                                            {new Date(sub.subscribed_at).toLocaleDateString()}
                                            <span className="text-xs text-zinc-600 block">
                                                {new Date(sub.subscribed_at).toLocaleTimeString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400">
                                            <span className="px-2 py-1 bg-zinc-800 rounded text-xs border border-zinc-700">
                                                {sub.source === 'checkout' ? 'Carrito' : 'Registro'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{sub.ip_address}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                Activo
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                        No se encontraron suscriptores.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 text-xs text-zinc-500 flex justify-between">
                    <span>Total: {filteredSubscribers.length} suscriptores</span>
                    <span>Evidencia de consentimiento RGPD almacenada.</span>
                </div>
            </div>
        </div>
    );
}
