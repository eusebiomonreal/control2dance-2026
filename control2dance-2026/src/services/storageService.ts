/**
 * Servicio de Storage - Uploads a Supabase Storage
 */

import { supabase, createServerClient } from '../lib/supabase';

type Bucket = 'covers' | 'audio' | 'downloads';

interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

// Generar nombre único para archivo
function generateFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const safeName = originalName
    .replace(/\.[^/.]+$/, '') // Quitar extensión
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);

  return prefix
    ? `${prefix}/${safeName}-${timestamp}-${random}.${extension}`
    : `${safeName}-${timestamp}-${random}.${extension}`;
}

export const storageService = {
  /**
   * Subir imagen de portada
   */
  async uploadCoverImage(file: File, productSlug?: string): Promise<UploadResult> {
    try {
      const fileName = generateFileName(file.name, productSlug);

      const { data, error } = await supabase.storage
        .from('covers')
        .upload(fileName, file, {
          cacheControl: '31536000', // 1 año
          upsert: false
        });

      if (error) {
        console.error('Error uploading cover:', error);
        return { success: false, error: error.message };
      }

      const { data: urlData } = supabase.storage
        .from('covers')
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (err) {
      console.error('Error in uploadCoverImage:', err);
      return { success: false, error: 'Error subiendo imagen' };
    }
  },

  /**
   * Subir audio preview
   */
  async uploadAudioPreview(file: File, productSlug?: string): Promise<UploadResult> {
    try {
      const fileName = generateFileName(file.name, productSlug);

      const { data, error } = await supabase.storage
        .from('audio')
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: false
        });

      if (error) {
        console.error('Error uploading audio:', error);
        return { success: false, error: error.message };
      }

      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(data.path);

      return {
        success: true,
        url: urlData.publicUrl,
        path: data.path
      };
    } catch (err) {
      console.error('Error in uploadAudioPreview:', err);
      return { success: false, error: 'Error subiendo audio' };
    }
  },

  /**
   * Subir archivo master (privado)
   */
  async uploadMasterFile(file: File, productSlug: string): Promise<UploadResult> {
    try {
      const fileName = generateFileName(file.name, productSlug);

      const { data, error } = await supabase.storage
        .from('downloads')
        .upload(fileName, file, {
          cacheControl: '31536000',
          upsert: false
        });

      if (error) {
        console.error('Error uploading master:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        path: data.path
        // No retornamos URL pública para archivos privados
      };
    } catch (err) {
      console.error('Error in uploadMasterFile:', err);
      return { success: false, error: 'Error subiendo archivo master' };
    }
  },

  /**
   * Eliminar archivo de un bucket
   */
  async deleteFile(bucket: Bucket, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in deleteFile:', err);
      return false;
    }
  },

  /**
   * Obtener URL pública de un archivo
   */
  getPublicUrl(bucket: 'covers' | 'audio', path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  /**
   * Obtener URL firmada para descarga (archivos privados)
   */
  async getSignedUrl(bucket: Bucket, path: string, expiresIn = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  },

  /**
   * Listar archivos en un bucket (para admin)
   */
  async listFiles(bucket: Bucket, folder?: string): Promise<{ name: string; size: number; createdAt: string }[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder || '', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      return [];
    }

    return (data || []).map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      createdAt: file.created_at
    }));
  }
};

// Servicio para uso en servidor
export const storageServiceServer = {
  ...storageService,

  /**
   * Obtener tamaño de archivo en el bucket
   */
  async getFileSize(bucket: Bucket, path: string): Promise<number | null> {
    const serverClient = createServerClient();

    // Listar para obtener metadata
    const pathParts = path.split('/');
    const fileName = pathParts.pop() || '';
    const folder = pathParts.join('/');

    const { data, error } = await serverClient.storage
      .from(bucket)
      .list(folder, { search: fileName });

    if (error || !data?.length) {
      return null;
    }

    const file = data.find(f => f.name === fileName);
    return file?.metadata?.size || null;
  }
};
