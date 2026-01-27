/**
 * NewsletterComposer - Composición y envío de newsletters
 */

import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { Mail, Search, X, Send, ChevronLeft, ChevronRight, Eye, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Importación dinámica para evitar errores de SSR
const JoditEditor = lazy(() => import('jodit-react'));

interface Product {
  id: string;
  name: string;
  brand: string | null;
  catalog_number: string;
  cover_image: string | null;
  price: number;
  year: string | null;
  label: string | null;
  genre: string | null;
  styles: string[] | null;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

export default function NewsletterComposer() {
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Email state
  const [subject, setSubject] = useState('🎵 Nuevos discos en Control2Dance');
  const [headerText, setHeaderText] = useState('¡Hola! Echa un vistazo a los últimos discos que hemos añadido al archivo digital. Listos para sonar en tu próxima sesión.');
  const [footerText, setFooterText] = useState('Gracias por formar parte de la comunidad. ¡Nos vemos en la pista!');
  
  // Recipients
  const [recipientType, setRecipientType] = useState<'all' | 'test'>('test');
  const [testEmail, setTestEmail] = useState('');
  const [totalSubscribers, setTotalSubscribers] = useState(0);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    loadProducts();
    loadSubscriberCount();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, catalog_number, cover_image, price, year, label, genre, styles, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading products:', error);
        throw error;
      }
      
      console.log('[Newsletter] Productos cargados:', data?.length);
      setProducts(data || []);
    } catch (e) {
      console.error('Error loading products:', e);
    }
    setLoadingProducts(false);
  };

  const loadSubscriberCount = async () => {
    try {
      // Count users who have made at least one purchase (customers)
      const { count } = await supabase
        .from('orders')
        .select('customer_email', { count: 'exact', head: true })
        .eq('status', 'paid');
      
      setTotalSubscribers(count || 0);
    } catch (e) {
      console.error('Error loading subscriber count:', e);
    }
  };

  // Función de búsqueda mejorada
  const matchesSearch = (product: Product, query: string): boolean => {
    if (!query.trim()) return true;
    
    // Normalizar texto (quitar acentos y convertir a minúsculas)
    const normalize = (text: string) => 
      text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[-_]/g, ' '); // Convertir guiones a espacios
    
    const normalizedQuery = normalize(query);
    const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
    
    // Campos a buscar - cada campo por separado para mejor matching
    const fields = [
      product.name || '',
      product.brand || '',
      product.catalog_number || '',
      product.label || '',
      product.genre || '',
      product.year || '',
      ...(product.styles || [])
    ];
    
    const searchableText = normalize(fields.join(' '));
    
    // Al menos un término debe coincidir (OR) - más flexible
    return searchTerms.some(term => searchableText.includes(term));
  };

  const filteredProducts = products.filter(p => 
    !selectedProducts.find(sp => sp.id === p.id) &&
    matchesSearch(p, searchQuery)
  );

  const addProduct = (product: Product) => {
    setSelectedProducts([...selectedProducts, product]);
  };

  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newProducts = [...selectedProducts];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newProducts.length) return;
    [newProducts[index], newProducts[newIndex]] = [newProducts[newIndex], newProducts[index]];
    setSelectedProducts(newProducts);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      alert('Añade un asunto para el email');
      return;
    }
    if (selectedProducts.length === 0) {
      alert('Selecciona al menos un disco');
      return;
    }
    if (recipientType === 'test' && !testEmail.trim()) {
      alert('Añade un email de prueba');
      return;
    }

    const confirmMessage = recipientType === 'all' 
      ? `¿Enviar newsletter a ${totalSubscribers} suscriptores?`
      : `¿Enviar email de prueba a ${testEmail}?`;

    if (!confirm(confirmMessage)) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          headerText,
          footerText,
          products: selectedProducts,
          recipientType,
          testEmail: recipientType === 'test' ? testEmail : undefined
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar');
      }

      setResult(data);
    } catch (e: any) {
      setResult({
        success: false,
        sent: 0,
        failed: 1,
        errors: [e.message]
      });
    }
    setSending(false);
  };

  const generatePreviewHtml = () => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Newsletter Control2Dance'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%); padding: 40px 30px; text-align: center;">
              <img src="https://dev.control2dance.es/logo-blanco.svg" alt="Control2Dance" style="width: 200px; height: auto;">
            </td>
          </tr>
          
          ${headerText ? `
          <!-- Header Text -->
          <tr>
            <td style="padding: 30px 30px 0; text-align: center;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">${headerText}</p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Products -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333; font-size: 20px; margin: 0 0 20px; text-align: center;">🎵 Nuevos Vinilos</h2>
              ${selectedProducts.map(product => `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td width="120" style="vertical-align: top;">
                      <img src="${product.cover_image || 'https://dev.control2dance.es/placeholder.jpg'}" alt="${product.name}" style="width: 120px; height: 120px; object-fit: cover; display: block;">
                    </td>
                    <td style="padding: 15px; vertical-align: top;">
                      <h3 style="margin: 0 0 8px; font-size: 16px; color: #333;">${product.name}</h3>
                      <p style="margin: 0 0 5px; font-size: 13px; color: #666;">${product.catalog_number}</p>
                      <p style="margin: 0 0 5px; font-size: 13px; color: #888;">${[product.label, product.year].filter(Boolean).join(' · ')}</p>
                      <p style="margin: 10px 0 0; font-size: 18px; font-weight: bold; color: #ff4d7d;">${formatPrice(product.price)}</p>
                    </td>
                  </tr>
                </table>
              `).join('')}
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://dev.control2dance.es/catalogo" style="display: inline-block; background-color: #ff4d7d; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Ver catálogo completo</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${footerText ? `
          <!-- Footer Text -->
          <tr>
            <td style="padding: 0 30px 20px; text-align: center;">
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">${footerText}</p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 4px solid #ff4d7d;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                Control2Dance · El archivo digital del DJ
              </p>
              <p style="color: #aaa; font-size: 11px; margin: 10px 0 0;">
                <a href="https://dev.control2dance.es" style="color: #ff4d7d; text-decoration: none;">control2dance.es</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Mail className="w-7 h-7 text-pink-400" />
          Newsletter
        </h1>
        <p className="text-zinc-400">Envía emails con las novedades del catálogo</p>
      </div>

      {/* Result message */}
      {result && (
        <div className={`p-4 rounded-xl flex items-start gap-3 ${
          result.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={result.success ? 'text-emerald-300' : 'text-red-300'}>
              {result.success 
                ? `Newsletter enviado correctamente a ${result.sent} destinatarios`
                : `Error al enviar: ${result.errors?.join(', ')}`
              }
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column - Email config */}
        <div className="space-y-6">
          {/* Email details */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Configuración del email</h2>
            
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Asunto *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: 🎵 Nuevos vinilos esta semana"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Texto de cabecera (opcional)</label>
              <div className="jodit-dark rounded-lg overflow-hidden">
                <Suspense fallback={<div className="h-48 bg-zinc-800 animate-pulse rounded-lg" />}>
                  <JoditEditor
                    value={headerText}
                    config={{
                      readonly: false,
                      theme: 'dark',
                      height: 200,
                      placeholder: '¡Hola! Mira los últimos vinilos que hemos añadido...',
                      buttons: ['bold', 'italic', 'underline', 'strikethrough', '|', 'ul', 'ol', '|', 'font', 'fontsize', 'brush', '|', 'link', 'image', '|', 'align', '|', 'undo', 'redo', '|', 'eraser', 'source'],
                      buttonsMD: ['bold', 'italic', 'underline', '|', 'ul', 'ol', '|', 'brush', 'link', '|', 'source'],
                      buttonsSM: ['bold', 'italic', '|', 'brush', 'link'],
                      toolbarAdaptive: true,
                      showCharsCounter: false,
                      showWordsCounter: false,
                      showXPathInStatusbar: false,
                      askBeforePasteHTML: false,
                      askBeforePasteFromWord: false,
                      disablePlugins: ['speech-recognize', 'ai-assistant'],
                    }}
                    onBlur={(newContent) => setHeaderText(newContent)}
                  />
                </Suspense>
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Texto de pie (opcional)</label>
              <div className="jodit-dark rounded-lg overflow-hidden">
                <Suspense fallback={<div className="h-36 bg-zinc-800 animate-pulse rounded-lg" />}>
                  <JoditEditor
                    value={footerText}
                    config={{
                      readonly: false,
                      theme: 'dark',
                      height: 150,
                      placeholder: '¡Gracias por ser parte de la comunidad!',
                      buttons: ['bold', 'italic', 'underline', '|', 'brush', 'link', '|', 'eraser', 'source'],
                      toolbarAdaptive: true,
                      showCharsCounter: false,
                      showWordsCounter: false,
                      showXPathInStatusbar: false,
                      askBeforePasteHTML: false,
                      askBeforePasteFromWord: false,
                      disablePlugins: ['speech-recognize', 'ai-assistant'],
                    }}
                    onBlur={(newContent) => setFooterText(newContent)}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Destinatarios</h2>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'test'}
                  onChange={() => setRecipientType('test')}
                  className="w-4 h-4 text-pink-500 bg-zinc-800 border-zinc-600 focus:ring-pink-500"
                />
                <span className="text-white">Email de prueba</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'all'}
                  onChange={() => setRecipientType('all')}
                  className="w-4 h-4 text-pink-500 bg-zinc-800 border-zinc-600 focus:ring-pink-500"
                />
                <span className="text-white">Todos los clientes ({totalSubscribers})</span>
              </label>
            </div>

            {recipientType === 'test' && (
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
              />
            )}

            {recipientType === 'all' && (
              <p className="text-sm text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Se enviará a todos los clientes que han realizado una compra
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowPreview(true)}
              disabled={selectedProducts.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Eye className="w-5 h-5" />
              Vista previa
            </button>
            <button
              onClick={handleSend}
              disabled={sending || selectedProducts.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column - Products */}
        <div className="space-y-6">
          {/* Selected products */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Discos seleccionados ({selectedProducts.length})
              </h2>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {selectedProducts.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  Selecciona discos del catálogo
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {selectedProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/50">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveProduct(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                        >
                          <ChevronLeft className="w-4 h-4 rotate-90" />
                        </button>
                        <button
                          onClick={() => moveProduct(index, 'down')}
                          disabled={index === selectedProducts.length - 1}
                          className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                        >
                          <ChevronRight className="w-4 h-4 rotate-90" />
                        </button>
                      </div>
                      <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                        {product.cover_image ? (
                          <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">🎵</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{product.name}</p>
                        <p className="text-sm text-zinc-500">{product.catalog_number}</p>
                      </div>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product search */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, catálogo, sello, género o año..."
                  className="w-full pl-10 pr-10 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-zinc-500 mt-2">
                  {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''} 
                  {filteredProducts.length > 50 && ' (mostrando primeros 50)'}
                </p>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loadingProducts ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  {searchQuery ? (
                    <div>
                      <p>No se encontraron discos para "{searchQuery}"</p>
                      <p className="text-xs mt-1">Prueba con otros términos</p>
                    </div>
                  ) : 'No hay más discos disponibles'}
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filteredProducts.slice(0, 50).map(product => (
                    <button
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                        {product.cover_image ? (
                          <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">🎵</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{product.name}</p>
                        <p className="text-sm text-zinc-500">{product.catalog_number}</p>
                      </div>
                      <span className="text-pink-400 font-medium">{formatPrice(product.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-700">
              <h3 className="text-lg font-semibold text-white">Vista previa del email</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              srcDoc={generatePreviewHtml()}
              className="w-full h-[70vh]"
              title="Email preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
