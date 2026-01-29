/**
 * ProductForm - Formulario para crear/editar productos
 */

import { useState, useEffect } from 'react';
import { createProduct, updateProduct } from '../../stores/adminStore';
import { storageService } from '../../services/storageService';
import type { Product as DBProduct, AudioPreview, MasterFile } from '../../lib/database.types';
import {
  Save,
  ArrowLeft,
  Upload,
  X,
  Plus,
  Music,
  Image as ImageIcon,
  Loader2,
  Download
} from 'lucide-react';

interface ProductFormProps {
  product?: DBProduct;
  isEdit?: boolean;
}

interface TracklistItem {
  position: string;
  title: string;
  duration?: string;
}

interface CreditItem {
  role: string;
  name: string;
}

interface FormData {
  catalog_number: string;
  name: string;
  brand: string;
  slug: string;
  description: string;
  price: string;
  year: string;
  label: string;
  genre: string;
  styles: string[];
  format: string;
  country: string;
  cover_image: string;
  audio_previews: AudioPreview[];
  master_files: MasterFile[];
  is_active: boolean;
  // Campos de Discogs
  discogs_url: string;
  barcode: string;
  tracklist: TracklistItem[];
  credits: CreditItem[];
}

const GENRES = ['Electronic', 'House', 'Techno', 'Trance', 'Dance', 'Hardcore', 'Makina'];
const STYLES = ['Hard House', 'Bumping', 'Makina', 'Newstyle', 'Poky', 'Hardstyle', 'Jumpstyle'];

export default function ProductForm({ product, isEdit = false }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>(() => {
    // Normalizar audio_previews - puede venir como array de strings o array de objetos
    let normalizedPreviews: AudioPreview[] = [];
    if (product?.audio_previews) {
      const previews = product.audio_previews as any[];
      normalizedPreviews = previews.map((p: any) => {
        if (typeof p === 'string') {
          // Es solo una URL, extraer nombre del archivo
          const fileName = p.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/-/g, ' ') || 'Track';
          return { url: p, track_name: fileName };
        }
        return p as AudioPreview;
      });
    }

    // Normalizar master_files - puede venir como string (legacy) o array de objetos
    let normalizedMasterFiles: MasterFile[] = [];
    const productAny = product as any;
    if (productAny?.master_files && Array.isArray(productAny.master_files)) {
      normalizedMasterFiles = productAny.master_files;
    } else if (product?.master_file_path) {
      // Legacy: convertir string a array
      const fileName = product.master_file_path.split('/').pop() || 'master.wav';
      normalizedMasterFiles = [{
        path: product.master_file_path,
        file_name: fileName,
        file_size: 0
      }];
    }

    return {
      catalog_number: product?.catalog_number || '',
      name: product?.name || '',
      brand: product?.brand || '',
      slug: product?.slug || '',
      description: product?.description || '',
      price: product?.price?.toString() || '3.99',
      year: product?.year || new Date().getFullYear().toString(),
      label: product?.label || 'Control2Dance Records',
      genre: product?.genre || 'Electronic',
      styles: product?.styles || [],
      format: product?.format || 'Digital',
      country: product?.country || 'Spain',
      cover_image: product?.cover_image || '',
      audio_previews: normalizedPreviews,
      master_files: normalizedMasterFiles,
      is_active: product?.is_active ?? true,
      // Campos de Discogs
      discogs_url: (product as any)?.discogs_url || '',
      barcode: (product as any)?.barcode || '',
      tracklist: (product as any)?.tracklist || [],
      credits: (product as any)?.credits || []
    };
  });

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingMaster, setUploadingMaster] = useState(false);
  const [importingDiscogs, setImportingDiscogs] = useState(false);
  const [newStyle, setNewStyle] = useState('');
  const [dragOverCover, setDragOverCover] = useState(false);
  const [dragOverAudio, setDragOverAudio] = useState(false);
  const [dragOverMaster, setDragOverMaster] = useState(false);

  // Handlers para drag & drop de portada
  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCover(true);
  };

  const handleCoverDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCover(false);
  };

  const handleCoverDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCover(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        await processCoverUpload(file);
      } else {
        setError('Solo se permiten archivos de imagen');
      }
    }
  };

  // Handlers para drag & drop de audio
  const handleAudioDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAudio(true);
  };

  const handleAudioDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAudio(false);
  };

  const handleAudioDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverAudio(false);

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('audio/') || f.name.endsWith('.mp3') || f.name.endsWith('.wav')
    );

    if (files.length > 0) {
      await processAudioUpload(files);
    } else {
      setError('Solo se permiten archivos de audio (MP3, WAV)');
    }
  };

  // Función compartida para procesar upload de portada
  const processCoverUpload = async (file: File) => {
    setUploadingCover(true);
    setError(null);

    try {
      const result = await storageService.uploadCoverImage(file, formData.slug || formData.catalog_number);
      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, cover_image: result.url! }));
      } else {
        setError(result.error || 'Error subiendo imagen');
      }
    } catch (err) {
      setError('Error subiendo imagen');
    } finally {
      setUploadingCover(false);
    }
  };

  // Función compartida para procesar upload de audio
  const processAudioUpload = async (files: File[]) => {
    setUploadingAudio(true);
    setError(null);

    try {
      const newPreviews: AudioPreview[] = [];

      for (const file of files) {
        const result = await storageService.uploadAudioPreview(file, formData.slug || formData.catalog_number);
        if (result.success && result.url) {
          newPreviews.push({
            url: result.url,
            track_name: file.name.replace(/\.[^/.]+$/, '').replace(/-/g, ' ')
          });
        }
      }

      setFormData(prev => ({
        ...prev,
        audio_previews: [...prev.audio_previews, ...newPreviews]
      }));
    } catch (err) {
      setError('Error subiendo audio');
    } finally {
      setUploadingAudio(false);
    }
  };

  // Handlers para drag & drop de archivo master
  const handleMasterDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMaster(true);
  };

  const handleMasterDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMaster(false);
  };

  const handleMasterDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverMaster(false);

    const files = Array.from(e.dataTransfer.files);
    const validExtensions = ['.wav', '.zip', '.rar', '.flac'];

    for (const file of files) {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (validExtensions.includes(ext)) {
        await processMasterUpload(file);
      } else {
        setError('Solo se permiten archivos WAV, ZIP, RAR o FLAC');
      }
    }
  };

  // Función para procesar upload de archivo master
  const processMasterUpload = async (file: File) => {
    setUploadingMaster(true);
    setError(null);

    try {
      const result = await storageService.uploadMasterFile(file, formData.slug || formData.catalog_number);
      if (result.success && result.path) {
        const newMasterFile: MasterFile = {
          path: result.path,
          file_name: file.name,
          file_size: file.size
        };
        setFormData(prev => ({
          ...prev,
          master_files: [...prev.master_files, newMasterFile]
        }));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || 'Error subiendo archivo master');
      }
    } catch (err) {
      setError('Error subiendo archivo master');
    } finally {
      setUploadingMaster(false);
    }
  };

  const handleMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      await processMasterUpload(file);
    }
  };

  // Función para eliminar un archivo master
  const removeMasterFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      master_files: prev.master_files.filter((_, i) => i !== index)
    }));
  };

  // Función para formatear tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Importar datos desde Discogs
  const handleImportDiscogs = async () => {
    if (!formData.discogs_url) {
      setError('Primero introduce una URL de Discogs');
      return;
    }

    setImportingDiscogs(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/discogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.discogs_url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error importando desde Discogs');
      }

      // Actualizar formData con los datos de Discogs
      setFormData(prev => ({
        ...prev,
        discogs_url: data.discogs_url || prev.discogs_url,
        barcode: data.barcode || prev.barcode,
        tracklist: data.tracklist?.length > 0 ? data.tracklist : prev.tracklist,
        credits: data.credits?.length > 0 ? data.credits : prev.credits,
        // Solo actualizar estos si están vacíos
        year: prev.year || data.year || '',
        label: prev.label || data.label || '',
        genre: prev.genre || data.genre || '',
        styles: prev.styles.length > 0 ? prev.styles : data.styles || [],
        country: prev.country || data.country || '',
        format: prev.format || data.format || '',
        // Importar media (solo si está vacío)
        cover_image: prev.cover_image || data.cover_image || '',
        // Audio previews: Mantener los que hay. Si no hay, usar los de Discogs (que ahora vendrán vacíos si no son videos)
        audio_previews: prev.audio_previews.length > 0
          ? prev.audio_previews
          : (data.videos?.map((v: any) => ({
            url: v.url,
            track_name: v.title
          })) || [])
      }));

      // 2. Revisar si hay audios legacy (control2dance.es) y migrarlos (Sideload)
      // Usamos prev.audio_previews porque es lo que acabamos de "mantener" en setFormData (aunque setFormData es async, aquí usamos el estado 'prev' conceptualmente, pero técnicamente necesitamos acceder al valor actualizado o al previo)
      // Accedemos a formData.audio_previews? No, porque setNameData no se ha ejecutado aun.
      // Debemos mirar 'prev.audio_previews' del scope anterior.
      const currentPreviews = formData.audio_previews; // This is the state BEFORE the setFormData above? Yes.
      // But wait, if we are importing for the first time, currentPreviews is empty?
      // If it is empty, we have nothing to sideload.
      // If it is NOT empty (editing existing product), we might have legacy URLs.

      // Sideloading cancelado. Se mantiene lógica de no sobrescribir si ya existe.

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImportingDiscogs(false);
    }
  };

  // Generar slug automáticamente desde catalog_number
  useEffect(() => {
    if (!isEdit && formData.catalog_number) {
      const slug = formData.catalog_number
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.catalog_number, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processCoverUpload(file);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    await processAudioUpload(Array.from(files));
  };

  const removeAudioPreview = (index: number) => {
    setFormData(prev => ({
      ...prev,
      audio_previews: prev.audio_previews.filter((_, i) => i !== index)
    }));
  };

  const updateTrackName = (index: number, name: string) => {
    setFormData(prev => ({
      ...prev,
      audio_previews: prev.audio_previews.map((ap, i) =>
        i === index ? { ...ap, track_name: name } : ap
      )
    }));
  };

  const addStyle = () => {
    if (newStyle && !formData.styles.includes(newStyle)) {
      setFormData(prev => ({
        ...prev,
        styles: [...prev.styles, newStyle]
      }));
      setNewStyle('');
    }
  };

  const removeStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      styles: prev.styles.filter(s => s !== style)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const productData = {
        catalog_number: formData.catalog_number,
        name: formData.name,
        brand: formData.brand || null,
        slug: formData.slug,
        description: formData.description || null,
        price: parseFloat(formData.price),
        year: formData.year || null,
        label: formData.label || null,
        genre: formData.genre || null,
        styles: formData.styles.length > 0 ? formData.styles : null,
        format: formData.format || null,
        country: formData.country || null,
        cover_image: formData.cover_image || null,
        audio_previews: formData.audio_previews.length > 0 ? formData.audio_previews : null,
        master_files: formData.master_files.length > 0 ? formData.master_files : null,
        // Legacy fields for backwards compatibility
        master_file_path: formData.master_files.length > 0 ? formData.master_files[0].path : null,
        master_file_size: formData.master_files.length > 0 ? formData.master_files[0].file_size : null,
        meta_title: `${formData.name} - ${formData.brand}`,
        meta_description: formData.description?.slice(0, 160) || null,
        is_active: formData.is_active,
        // Campos de Discogs
        discogs_url: formData.discogs_url || null,
        barcode: formData.barcode || null,
        tracklist: formData.tracklist.length > 0 ? formData.tracklist : null,
        credits: formData.credits.length > 0 ? formData.credits : null
      };

      let result;
      if (isEdit && product) {
        result = await updateProduct(product.id, productData);
      } else {
        result = await createProduct(productData as any);
      }

      if (result) {
        setSuccess(true);
        if (!isEdit) {
          // Redirigir a la lista después de crear
          setTimeout(() => {
            window.location.href = '/admin/products';
          }, 1500);
        }
      } else {
        setError('Error guardando producto');
      }
    } catch (err: any) {
      setError(err.message || 'Error guardando producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <a
          href="/admin/products"
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a productos
        </a>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
          {isEdit ? 'Producto actualizado correctamente' : 'Producto creado correctamente'}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Información básica</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Número de catálogo *
                </label>
                <input
                  type="text"
                  name="catalog_number"
                  value={formData.catalog_number}
                  onChange={handleChange}
                  required
                  placeholder="C2D-12345"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="c2d-12345"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Nombre del producto *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Nombre del release"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Artista / Brand
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Nombre del artista"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Descripción del producto..."
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Precio (EUR) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Año
                </label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="2024"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Sello
                </label>
                <input
                  type="text"
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Género
                </label>
                <select
                  name="genre"
                  value={formData.genre}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  {GENRES.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  País
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Styles */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Estilos
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.styles.map(style => (
                  <span
                    key={style}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-full"
                  >
                    {style}
                    <button
                      type="button"
                      onClick={() => removeStyle(style)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={newStyle}
                  onChange={(e) => setNewStyle(e.target.value)}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Seleccionar estilo...</option>
                  {STYLES.filter(s => !formData.styles.includes(s)).map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addStyle}
                  disabled={!newStyle}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Discogs Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-[#ff4d7d]">●</span> Información de Discogs
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  URL de Discogs
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    name="discogs_url"
                    value={formData.discogs_url}
                    onChange={handleChange}
                    placeholder="https://www.discogs.com/release/..."
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleImportDiscogs}
                    disabled={importingDiscogs || !formData.discogs_url}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                    title="Importar datos desde Discogs"
                  >
                    {importingDiscogs ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Importar</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Barcode
                </label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  placeholder="8423646718337"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tracklist */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Tracklist
              </label>
              <div className="space-y-2 mb-3">
                {formData.tracklist.map((track, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={track.position}
                      onChange={(e) => {
                        const newTracklist = [...formData.tracklist];
                        newTracklist[index] = { ...track, position: e.target.value };
                        setFormData(prev => ({ ...prev, tracklist: newTracklist }));
                      }}
                      placeholder="A1"
                      className="w-16 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={track.title}
                      onChange={(e) => {
                        const newTracklist = [...formData.tracklist];
                        newTracklist[index] = { ...track, title: e.target.value };
                        setFormData(prev => ({ ...prev, tracklist: newTracklist }));
                      }}
                      placeholder="Nombre del track"
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={track.duration || ''}
                      onChange={(e) => {
                        const newTracklist = [...formData.tracklist];
                        newTracklist[index] = { ...track, duration: e.target.value };
                        setFormData(prev => ({ ...prev, tracklist: newTracklist }));
                      }}
                      placeholder="5:30"
                      className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          tracklist: prev.tracklist.filter((_, i) => i !== index)
                        }));
                      }}
                      className="p-2 text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    tracklist: [...prev.tracklist, { position: '', title: '', duration: '' }]
                  }));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Añadir track
              </button>
            </div>

            {/* Credits */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Créditos
              </label>
              <div className="space-y-2 mb-3">
                {formData.credits.map((credit, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={credit.role}
                      onChange={(e) => {
                        const newCredits = [...formData.credits];
                        newCredits[index] = { ...credit, role: e.target.value };
                        setFormData(prev => ({ ...prev, credits: newCredits }));
                      }}
                      placeholder="Written-By, Producer..."
                      className="w-40 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={credit.name}
                      onChange={(e) => {
                        const newCredits = [...formData.credits];
                        newCredits[index] = { ...credit, name: e.target.value };
                        setFormData(prev => ({ ...prev, credits: newCredits }));
                      }}
                      placeholder="Nombre"
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          credits: prev.credits.filter((_, i) => i !== index)
                        }));
                      }}
                      className="p-2 text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    credits: [...prev.credits, { role: '', name: '' }]
                  }));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" />
                Añadir crédito
              </button>
            </div>
          </div>

          {/* Audio Previews */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Audio Previews</h2>

            {formData.audio_previews.length > 0 && (
              <div className="space-y-3">
                {formData.audio_previews.map((preview, index) => (
                  <div
                    key={index}
                    className="p-3 bg-zinc-800 rounded-lg space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <Music className="w-5 h-5 text-zinc-500" />
                      <input
                        type="text"
                        value={preview.track_name}
                        onChange={(e) => updateTrackName(index, e.target.value)}
                        className="flex-1 px-3 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeAudioPreview(index)}
                        className="p-1 text-zinc-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="pl-8">
                      <a
                        href={preview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 break-all"
                      >
                        {preview.url}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${dragOverAudio
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-zinc-700 hover:border-indigo-500'
                }`}
              onDragOver={handleAudioDragOver}
              onDragLeave={handleAudioDragLeave}
              onDrop={handleAudioDrop}
            >
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleAudioUpload}
                className="hidden"
              />
              {uploadingAudio ? (
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                  <p className="text-zinc-400">
                    {dragOverAudio ? 'Soltar archivos aquí' : 'Arrastra o haz clic para subir'}
                  </p>
                  <p className="text-sm text-zinc-600">MP3, WAV, OGG (max 20MB)</p>
                </>
              )}
            </label>
          </div>

          {/* Archivos Master (Descarga) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Archivos Master</h2>
              <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Descarga de pago</span>
            </div>
            <p className="text-sm text-zinc-500">
              Estos son los archivos que los clientes descargarán tras la compra. Sube archivos WAV, FLAC o ZIP con todos los tracks.
            </p>

            {/* Lista de archivos master */}
            {formData.master_files.length > 0 && (
              <div className="space-y-2">
                {formData.master_files.map((masterFile, index) => (
                  <div key={index} className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{masterFile.file_name}</p>
                        <p className="text-xs text-zinc-500">
                          {masterFile.file_size > 0 && formatFileSize(masterFile.file_size)}
                          {masterFile.file_size > 0 && ' • '}
                          <span className="truncate">{masterFile.path}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMasterFile(index)}
                        className="p-1 text-zinc-500 hover:text-red-400 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all ${dragOverMaster
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-700 hover:border-emerald-500'
                }`}
              onDragOver={handleMasterDragOver}
              onDragLeave={handleMasterDragLeave}
              onDrop={handleMasterDrop}
            >
              <label className="cursor-pointer text-center">
                <input
                  type="file"
                  accept=".wav,.flac,.zip,.rar"
                  multiple
                  onChange={handleMasterUpload}
                  className="hidden"
                />
                {uploadingMaster ? (
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                ) : (
                  <>
                    <Download className="w-8 h-8 text-zinc-500 mb-2 mx-auto" />
                    <p className="text-zinc-400">
                      {dragOverMaster ? 'Soltar archivos aquí' : 'Arrastra o haz clic para subir'}
                    </p>
                    <p className="text-sm text-zinc-600">WAV, FLAC, ZIP, RAR (max 500MB cada uno)</p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cover Image */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Portada</h2>

            <div
              className={`aspect-square bg-zinc-800 rounded-lg overflow-hidden relative transition-all ${dragOverCover ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-900' : ''
                }`}
              onDragOver={handleCoverDragOver}
              onDragLeave={handleCoverDragLeave}
              onDrop={handleCoverDrop}
            >
              {formData.cover_image ? (
                <img
                  src={formData.cover_image}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-zinc-600 mb-2" />
                  <p className="text-zinc-500 text-sm">Arrastra una imagen aquí</p>
                </div>
              )}
              {dragOverCover && (
                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                  <p className="text-white font-medium">Soltar imagen</p>
                </div>
              )}
              {uploadingCover && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/webp,image/jpeg,image/png,image/gif"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <Upload className="w-5 h-5" />
              Subir imagen
            </label>
            <p className="text-xs text-zinc-500 text-center">WebP, JPG, PNG (recomendado: WebP)</p>

            <input
              type="text"
              name="cover_image"
              value={formData.cover_image}
              onChange={handleChange}
              placeholder="O pegar URL de imagen"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Estado</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
              />
              <span className="text-white">Producto activo</span>
            </label>
            <p className="text-sm text-zinc-500">
              Los productos inactivos no aparecen en el catálogo público.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}
