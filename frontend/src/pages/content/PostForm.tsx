import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios.config';
import { ContentPost } from '../../types';

interface PostFormProps {
  postId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PostFormData {
  title?: string;
  content: string;
  social_platform?: string;
  status: string;
  scheduled_at?: string;
}

const PostForm: React.FC<PostFormProps> = ({ postId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PostFormData>({
    defaultValues: {
      status: 'draft',
    },
  });

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await api.get(`/content/posts/${postId}`);
      if (response.data.success) {
        const data = response.data.data;
        reset({
          ...data,
          scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки поста');
    }
  };

  const onSubmit = async (data: PostFormData) => {
    setError('');
    setLoading(true);
    try {
      const submitData = {
        ...data,
        scheduled_at: data.scheduled_at || null,
      };
      if (postId) {
        await api.put(`/content/posts/${postId}`, submitData);
      } else {
        await api.post('/content/posts', submitData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения поста');
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
        <input
          {...register('title')}
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Содержание <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('content', { required: 'Содержание обязательно' })}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Платформа</label>
          <select
            {...register('social_platform')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Выберите платформу</option>
            <option value="instagram">Instagram</option>
            <option value="vk">VK</option>
            <option value="telegram">Telegram</option>
            <option value="ok">Одноклассники</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="draft">Черновик</option>
            <option value="scheduled">Запланирован</option>
            <option value="published">Опубликован</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Запланировать на</label>
        <input
          {...register('scheduled_at')}
          type="datetime-local"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
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
          {loading ? 'Сохранение...' : postId ? 'Обновить' : 'Создать'}
        </button>
      </div>
    </form>
  );
};

export default PostForm;

