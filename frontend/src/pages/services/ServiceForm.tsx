import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios.config';
import { Service } from '../../types';

interface ServiceFormProps {
  serviceId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ServiceFormData {
  name: string;
  description?: string;
  price: number;
  unit?: string;
  status: string;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ serviceId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ServiceFormData>({
    defaultValues: {
      status: 'active',
    },
  });

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const fetchService = async () => {
    try {
      const response = await api.get(`/services/${serviceId}`);
      if (response.data.success) {
        reset(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки услуги');
    }
  };

  const onSubmit = async (data: ServiceFormData) => {
    setError('');
    setLoading(true);
    try {
      if (serviceId) {
        await api.put(`/services/${serviceId}`, data);
      } else {
        await api.post('/services', data);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения услуги');
    } finally {
      setLoading(false);
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
          Название <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name', { required: 'Название обязательно' })}
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Цена (₽) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('price', { required: 'Цена обязательна', valueAsNumber: true, min: 0 })}
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Единица измерения</label>
          <select
            {...register('unit')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Выберите единицу</option>
            <option value="item">Штука</option>
            <option value="hour">Час</option>
            <option value="month">Месяц</option>
            <option value="day">День</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
        <select
          {...register('status')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="active">Активна</option>
          <option value="inactive">Неактивна</option>
        </select>
      </div>

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
          {loading ? 'Сохранение...' : serviceId ? 'Обновить' : 'Создать'}
        </button>
      </div>
    </form>
  );
};

export default ServiceForm;

