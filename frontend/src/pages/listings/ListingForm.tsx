import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios.config';
import { Listing, Product, Client, ListingMedia } from '../../types';
import ListingMediaManager from '../../components/listings/ListingMediaManager';

interface ListingFormProps {
  listingId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ListingFormData {
  product_id: number;
  marketplace: string;
  external_id?: string;
  title?: string;
  description?: string;
  price?: number;
  status: string;
}

const ListingForm: React.FC<ListingFormProps> = ({ listingId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [listingMedia, setListingMedia] = useState<ListingMedia[]>([]);
  const [currentListingId, setCurrentListingId] = useState<number | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ListingFormData>({
    defaultValues: {
      status: 'draft',
    },
  });

  useEffect(() => {
    fetchProducts();
    if (listingId) {
      fetchListing();
    } else {
      setCurrentListingId(null);
      setListingMedia([]);
    }
  }, [listingId]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
    }
  };

  const fetchListing = async () => {
    try {
      const response = await api.get(`/listings/${listingId}`);
      if (response.data.success) {
        const data = response.data.data;
        reset({
          product_id: data.product_id,
          marketplace: data.marketplace,
          external_id: data.external_id || '',
          title: data.title || '',
          description: data.description || '',
          price: data.price || undefined,
          status: data.status,
        });
        setListingMedia(data.media || []);
        setCurrentListingId(data.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки объявления');
    }
  };

  const onSubmit = async (data: ListingFormData) => {
    setError('');
    setLoading(true);
    try {
      if (listingId) {
        await api.put(`/listings/${listingId}`, data);
        onSuccess();
      } else {
        const response = await api.post('/listings', data);
        if (response.data.success) {
          const savedListingId = response.data.data.id;
          setCurrentListingId(savedListingId);
          // Перезагружаем объявление чтобы получить медиа
          const listingResponse = await api.get(`/listings/${savedListingId}`);
          if (listingResponse.data.success) {
            setListingMedia(listingResponse.data.data.media || []);
          }
          // Не закрываем форму сразу, чтобы можно было загрузить фотографии
          // Пользователь может закрыть форму вручную или загрузить фотографии
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения объявления');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpdate = async () => {
    if (currentListingId) {
      try {
        const response = await api.get(`/listings/${currentListingId}`);
        if (response.data.success) {
          setListingMedia(response.data.data.media || []);
        }
      } catch (err) {
        console.error('Ошибка обновления фотографий:', err);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Товар <span className="text-red-500">*</span>
        </label>
        <select
          {...register('product_id', { required: 'Выберите товар', valueAsNumber: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={!!listingId}
        >
          <option value="">Выберите товар</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} {product.price ? `(${product.price.toLocaleString()} ₽)` : ''}
            </option>
          ))}
        </select>
        {errors.product_id && (
          <p className="mt-1 text-sm text-red-600">{errors.product_id.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Маркетплейс <span className="text-red-500">*</span>
        </label>
        <select
          {...register('marketplace', { required: 'Выберите маркетплейс' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          disabled={!!listingId}
        >
          <option value="">Выберите маркетплейс</option>
          <option value="avito">Avito</option>
          <option value="ozon">Ozon</option>
          <option value="wildberries">Wildberries</option>
          <option value="yandex_market">Яндекс Маркет</option>
        </select>
        {errors.marketplace && (
          <p className="mt-1 text-sm text-red-600">{errors.marketplace.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ID на маркетплейсе</label>
        <input
          {...register('external_id')}
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="avito_12345678"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
        <input
          {...register('title')}
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Название объявления"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Подробное описание товара для объявления"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Цена (₽)</label>
          <input
            {...register('price', { valueAsNumber: true, min: 0 })}
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="draft">Черновик</option>
            <option value="active">Активно</option>
            <option value="paused">Приостановлено</option>
            <option value="archived">Архив</option>
          </select>
        </div>
      </div>

      {/* Управление фотографиями - показываем только если объявление уже создано */}
      {currentListingId && (
        <div className="pt-4 border-t border-gray-200">
          <ListingMediaManager
            listingId={currentListingId}
            media={listingMedia}
            onUpdate={handleMediaUpdate}
          />
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : listingId ? 'Обновить' : 'Создать'}
        </button>
        {currentListingId && !listingId && (
          <button
            type="button"
            onClick={onSuccess}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Готово
          </button>
        )}
      </div>
    </form>
  );
};

export default ListingForm;

