import React, { useState, useRef } from 'react';
import api from '../../api/axios.config';
import { ListingMedia } from '../../types';
import { HiX, HiPhotograph, HiStar, HiTrash } from 'react-icons/hi';

interface ListingMediaManagerProps {
  listingId: number;
  media: ListingMedia[];
  onUpdate: () => void;
}

const ListingMediaManager: React.FC<ListingMediaManagerProps> = ({
  listingId,
  media,
  onUpdate,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });

      const response = await api.post(`/listings/${listingId}/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        onUpdate();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки фотографий');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
      return;
    }

    try {
      await api.delete(`/listings/${listingId}/media/${mediaId}`);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка удаления фотографии');
    }
  };

  const handleSetPrimary = async (mediaId: number) => {
    try {
      await api.patch(`/listings/${listingId}/media/${mediaId}/primary`);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка установки основной фотографии');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Фотографии объявления
        </label>
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="listing-images-upload"
          />
          <label
            htmlFor="listing-images-upload"
            className={`flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <HiPhotograph className="h-5 w-5 mr-2 text-gray-600" />
            <span className="text-sm text-gray-700">
              {uploading ? 'Загрузка...' : 'Добавить фотографии'}
            </span>
          </label>
          <span className="text-xs text-gray-500">
            Максимум 10 файлов, до 5MB каждый
          </span>
        </div>
      </div>

      {media && media.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {media.map((item) => (
            <div key={item.id} className="relative group">
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                <img
                  src={item.file_path}
                  alt={`Фото ${item.id}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EНет фото%3C/text%3E%3C/svg%3E';
                  }}
                />
                {item.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-400 rounded-full p-1">
                    <HiStar className="h-4 w-4 text-yellow-800" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                  {!item.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(item.id)}
                      className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                      title="Сделать основной"
                    >
                      <HiStar className="h-5 w-5 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors"
                    title="Удалить"
                  >
                    <HiTrash className="h-5 w-5 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!media || media.length === 0) && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <HiPhotograph className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Нет загруженных фотографий</p>
        </div>
      )}
    </div>
  );
};

export default ListingMediaManager;

