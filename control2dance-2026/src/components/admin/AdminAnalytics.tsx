/**
 * AdminAnalytics - Página dedicada de analíticas de negocio
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { adminStats, adminPeriodStats, adminPeriodOrders, loadAdminStats } from '../../stores/adminStore';
import { ShoppingCart, TrendingUp, RefreshCw, CheckCircle, AlertTriangle, CreditCard, BarChart3, ArrowLeft, Calendar, Eye, ExternalLink } from 'lucide-react';

interface StripeBalance {
    stripe: {
        available: number;
        pending: number;
        last30Days: number;
        refunded30Days: number;
        charges30Days: number;
        currency: string;
    };
    supabase: {
        last30Days: number;
        orders30Days: number;
    };
    sync: {
        difference: number;
        missingCount: number;
        ordersMatch: boolean;
        amountMatch: boolean;
    };
}

interface MissingSession {
    id: string;
    payment_intent: string;
    amount: number;
    customer_email: string;
    customer_name: string;
    created: string;
    line_items: number;
}

interface ReconcileData {
    stripe: { total: number; sessions: number };
    supabase: { total: number; orders: number };
    missing: { total: number; count: number; sessions: MissingSession[] };
    difference: number;
}

export default function AdminAnalytics() {
    const stats = useStore(adminStats);
    const periodStats = useStore(adminPeriodStats);
    const periodOrders = useStore(adminPeriodOrders);
    const [stripeBalance, setStripeBalance] = useState<StripeBalance | null>(null);
    const [loadingStripe, setLoadingStripe] = useState(false);
    const [reconcileData, setReconcileData] = useState<ReconcileData | null>(null);
    const [loadingReconcile, setLoadingReconcile] = useState(false);
    const [importing, setImporting] = useState<string | null>(null);
    const [period, setPeriod] = useState<string>('30');
    const [periodLabel, setPeriodLabel] = useState<string>('30 días');

    // Custom date states
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [isCustom, setIsCustom] = useState(false);

    useEffect(() => {
        if (!isCustom) {
            loadStatsForPeriod(period);
        }
    }, [period, isCustom]);

    const loadStatsForPeriod = async (days: string) => {
        const periodDays = parseInt(days);
        const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

        if (days === '3650') {
            await loadAdminStats();
        } else {
            await loadAdminStats(startDate);
        }

        loadStripeBalance({ days });
    };

    const loadCustomStats = async () => {
        if (!customStartDate) return;

        const startISO = new Date(customStartDate).toISOString();
        const endISO = customEndDate ? new Date(customEndDate).toISOString() : new Date().toISOString();

        await loadAdminStats(startISO, endISO);
        loadStripeBalance({ startDate: customStartDate, endDate: customEndDate });
        setPeriodLabel(`del ${new Date(customStartDate).toLocaleDateString()} al ${customEndDate ? new Date(customEndDate).toLocaleDateString() : 'hoy'}`);
    };

    const loadStripeBalance = async (params: { days?: string, startDate?: string, endDate?: string }) => {
        setLoadingStripe(true);
        try {
            let query = '';
            if (params.startDate) {
                query = `startDate=${params.startDate}${params.endDate ? `&endDate=${params.endDate}` : ''}`;
            } else {
                query = `days=${params.days || '30'}`;
            }

            const res = await fetch(`/api/admin/stripe-balance?${query}`);
            if (res.ok) {
                const data = await res.json();
                setStripeBalance(data);
                if (!data.sync.amountMatch || !data.sync.ordersMatch) {
                    await loadReconcileData(params);
                }
            }
        } catch (e) {
            console.error('Error loading Stripe balance:', e);
        }
        setLoadingStripe(false);
    };

    const loadReconcileData = async (params: { days?: string, startDate?: string, endDate?: string }) => {
        setLoadingReconcile(true);
        try {
            let query = '';
            if (params.startDate) {
                query = `startDate=${params.startDate}${params.endDate ? `&endDate=${params.endDate}` : ''}`;
            } else {
                query = `days=${params.days || '30'}`;
            }
            const res = await fetch(`/api/admin/reconcile?${query}`);
            if (res.ok) {
                const data = await res.json();
                setReconcileData(data);
            }
        } catch (e) {
            console.error('Error loading reconcile data:', e);
        }
        setLoadingReconcile(false);
    };

    const syncAllMissing = async () => {
        const sessions = reconcileData?.missing.sessions || [];
        if (sessions.length === 0) return;

        setImporting('all');
        let imported = 0;

        for (const session of sessions) {
            const res = await fetch('/api/admin/reconcile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: session.id })
            });
            if (res.ok) imported++;
        }

        await loadAdminStats();
        if (isCustom) loadCustomStats(); else loadStatsForPeriod(period);
        setReconcileData(null);
        setImporting(null);
    };

    const importSession = async (sessionId: string) => {
        setImporting(sessionId);
        const res = await fetch('/api/admin/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        if (res.ok) {
            if (isCustom) loadCustomStats(); else loadStatsForPeriod(period);
        }
        setImporting(null);
    };

    const formatCurrency = (amount: number, currency = 'EUR') => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <a href="/admin" className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </a>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Analíticas de Negocio</h1>
                        <p className="text-zinc-500 font-medium font-inter">Información detallada sobre tu rendimiento</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 shadow-xl">
                    {[
                        { id: '7', label: '7d' },
                        { id: '30', label: '30d' },
                        { id: '90', label: '90d' },
                        { id: '365', label: 'Año' },
                        { id: '3650', label: 'Todo' }
                    ].map((p) => (
                        <button
                            key={p.id}
                            onClick={() => {
                                setIsCustom(false);
                                setPeriod(p.id);
                                setPeriodLabel(p.label === 'Todo' ? 'todo el tiempo' : p.label);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isCustom && period === p.id
                                ? 'bg-[#ff4d7d] text-white shadow-lg shadow-[#ff4d7d]/20'
                                : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setIsCustom(true)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isCustom
                            ? 'bg-[#ff4d7d] text-white shadow-lg shadow-[#ff4d7d]/20'
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                            }`}
                    >
                        <Calendar className="w-3.5 h-3.5 inline-block mr-1" />
                        Personalizado
                    </button>
                </div>
            </div>

            {/* Custom Range Picker */}
            {isCustom && (
                <div className="bg-zinc-900 border-2 border-[#ff4d7d]/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-end gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Fecha de inicio</label>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-[#ff4d7d] outline-none transition-colors"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Fecha de fin</label>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-[#ff4d7d] outline-none transition-colors"
                        />
                    </div>
                    <button
                        onClick={loadCustomStats}
                        disabled={!customStartDate}
                        className="px-8 py-2.5 bg-[#ff4d7d] hover:bg-[#ff4d7d]/90 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-[#ff4d7d]/20"
                    >
                        Aplicar Rango
                    </button>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Pedidos ({periodLabel})</p>
                    </div>
                    <h3 className="text-4xl font-black text-white tracking-tight">
                        {isCustom || period !== '3650' ? (periodStats?.totalOrders || 0) : (stats?.totalOrders || 0)}
                    </h3>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Ingresos ({periodLabel})</p>
                    </div>
                    <h3 className="text-4xl font-black text-white tracking-tight">
                        {(isCustom || period !== '3650')
                            ? formatCurrency(periodStats?.totalRevenue || 0)
                            : formatCurrency(stats?.totalRevenue || 0)
                        }
                    </h3>
                </div>

                <div className="bg-zinc-950 border border-white/5 rounded-3xl p-8 space-y-4 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 className="w-24 h-24 text-white" />
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Ingresos Históricos</p>
                    </div>
                    <h3 className="text-4xl font-black text-[#ff4d7d] tracking-tight relative z-10">
                        {formatCurrency(stats?.totalRevenue || 0)}
                    </h3>
                </div>
            </div>

            {/* Stripe Comparison Block */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#635bff]/10 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-[#635bff]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Estado de Stripe</h2>
                            <p className="text-xs text-zinc-500">Comparativa directa por periodo</p>
                        </div>
                    </div>
                    <button onClick={() => isCustom ? loadCustomStats() : loadStripeBalance({ days: period })} disabled={loadingStripe} className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loadingStripe ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {stripeBalance ? (
                        <>
                            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 ${stripeBalance.sync.amountMatch && stripeBalance.sync.ordersMatch ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'
                                }`}>
                                <div className="flex items-center gap-4">
                                    {stripeBalance.sync.amountMatch && stripeBalance.sync.ordersMatch ? (
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center"><CheckCircle className="w-6 h-6 text-emerald-400" /></div>
                                    ) : (
                                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-amber-400" /></div>
                                    )}
                                    <div>
                                        <h4 className={`text-lg font-black uppercase tracking-tight ${stripeBalance.sync.amountMatch && stripeBalance.sync.ordersMatch ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {stripeBalance.sync.amountMatch && stripeBalance.sync.ordersMatch ? 'Sincronizado' : 'Pagos Discrepantes'}
                                        </h4>
                                        <p className="text-zinc-500 font-medium text-sm">Stripe reporta {formatCurrency(stripeBalance.stripe.last30Days)} en este periodo.</p>
                                    </div>
                                </div>
                                {!stripeBalance.sync.ordersMatch && (
                                    <button onClick={syncAllMissing} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl shadow-lg transition-all uppercase">
                                        Sincronizar {stripeBalance.sync.missingCount} Pedidos
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Disponible</p>
                                    <p className="text-xl font-black text-emerald-400">{formatCurrency(stripeBalance.stripe.available)}</p>
                                </div>
                                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Pendiente</p>
                                    <p className="text-xl font-black text-amber-400">{formatCurrency(stripeBalance.stripe.pending)}</p>
                                </div>
                                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Pagos en periodo</p>
                                    <p className="text-xl font-black text-white">{stripeBalance.stripe.charges30Days}</p>
                                </div>
                                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Moneda</p>
                                    <p className="text-xl font-black text-zinc-400">{stripeBalance.stripe.currency}</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center text-zinc-500 animate-pulse">Cargando datos financieros...</div>
                    )}
                </div>
            </section>

            {/* Order List for Period */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#ff4d7d]/10 rounded-xl flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-[#ff4d7d]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Pedidos en este periodo</h2>
                            <p className="text-xs text-zinc-500">Listado detallado de transacciones ({periodLabel})</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pedido</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Importe</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {periodOrders.length > 0 ? (
                                periodOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-white">
                                                #{order.order_number || order.id.substring(0, 8).toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-bold text-zinc-200">{order.customer_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-zinc-500">{order.customer_email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-zinc-400 font-medium">{formatDate(order.created_at)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-emerald-400">
                                                {formatCurrency(order.total)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a
                                                href={`/admin/orders/${order.id}`}
                                                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all inline-block"
                                                title="Ver detalle"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </a>
                                            {order.id.length > 8 && (
                                                <a
                                                    href={`/admin/orders/${order.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-all inline-block ml-1"
                                                    title="Abrir en pestaña nueva"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">
                                        No se encontraron pedidos en este periodo
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Reconcile List (Only if discrepancy) */}
            {reconcileData && reconcileData.missing.count > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Pagos Pendientes de Importar</h3>
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full">Total: {formatCurrency(reconcileData.missing.total)}</p>
                    </div>
                    <div className="space-y-3">
                        {reconcileData.missing.sessions.map(session => (
                            <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors gap-4">
                                <div>
                                    <p className="text-sm font-black text-white">{session.customer_email}</p>
                                    <p className="text-xs text-zinc-500 font-medium">{new Date(session.created).toLocaleDateString('es-ES')} • {session.line_items} productos</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-black text-white">{formatCurrency(session.amount)}</span>
                                    <button onClick={() => importSession(session.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-lg">Importar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
