import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../api/axios.config';
import Modal from '../../components/common/Modal';
import MarketplaceLogo from '../../components/common/MarketplaceLogo';
import { HiCog, HiCheckCircle, HiXCircle, HiRefresh } from 'react-icons/hi';

interface MarketplaceConnection {
  id?: number;
  marketplace: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at?: string;
}

interface ConnectionFormData {
  api_key?: string;
  api_secret?: string;
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  is_active: boolean;
}

const marketplaces = [
  { value: 'avito', label: 'Avito', icon: 'avito' },
  { value: 'ozon', label: 'Ozon', icon: 'ozon' },
  { value: 'wildberries', label: 'Wildberries', icon: 'wildberries' },
  { value: 'yandex_market', label: 'Яндекс Маркет', icon: 'yandex_market' },
];

const MarketplaceSettings: React.FC = () => {
  const [connections, setConnections] = useState<MarketplaceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarketplace, setEditingMarketplace] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ConnectionFormData>({
    defaultValues: {
      is_active: false,
    },
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketplace/connections');
      if (response.data.success) {
        setConnections(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки подключений');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (marketplace: string) => {
    try {
      const response = await api.get(`/marketplace/connections/${marketplace}`);
      if (response.data.success) {
        setEditingMarketplace(marketplace);
        reset({
          is_active: response.data.data.is_active || false,
          // Не показываем секретные данные, только статус
        });
        setIsModalOpen(true);
      } else {
        // Если подключения нет, создаем новое
        setEditingMarketplace(marketplace);
        reset({ is_active: false });
        setIsModalOpen(true);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Подключения нет, создаем новое
        setEditingMarketplace(marketplace);
        reset({ is_active: false });
        setIsModalOpen(true);
      } else {
        setError(err.response?.data?.error || 'Ошибка загрузки подключения');
      }
    }
  };

  const onSubmit = async (data: ConnectionFormData) => {
    if (!editingMarketplace) return;

    setError('');
    try {
      await api.post('/marketplace/connections', {
        marketplace: editingMarketplace,
        ...data,
      });
      setIsModalOpen(false);
      setEditingMarketplace(null);
      fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения подключения');
    }
  };

  const handleSync = async (marketplace: string) => {
    setSyncing(marketplace);
    try {
      const response = await api.post(`/marketplace/connections/${marketplace}/sync`);
      if (response.data.success) {
        fetchConnections();
        alert(`Синхронизация с ${marketplace} запущена успешно!`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка синхронизации');
    } finally {
      setSyncing(null);
    }
  };

  const getConnection = (marketplace: string) => {
    return connections.find((c) => c.marketplace === marketplace);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки подключений</h1>
          <p className="text-sm text-gray-500 mt-2">
            Настройте подключения к маркетплейсам для синхронизации данных
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {marketplaces.map((mp) => {
          const connection = getConnection(mp.value);
          const isConnected = connection?.is_active || false;

          return (
            <div
              key={mp.value}
              className="bg-white rounded-lg shadow p-6 border-2 border-gray-200 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <MarketplaceLogo marketplace={mp.value} className="w-12 h-12" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{mp.label}</h3>
                    <div className="flex items-center mt-1">
                      {isConnected ? (
                        <>
                          <HiCheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600">Подключено</span>
                        </>
                      ) : (
                        <>
                          <HiXCircle className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-500">Не подключено</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {connection?.last_sync_at && (
                <div className="mb-4 text-sm text-gray-500">
                  Последняя синхронизация:{' '}
                  {new Date(connection.last_sync_at).toLocaleString('ru-RU')}
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(mp.value)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                >
                  <HiCog className="h-4 w-4 mr-2" />
                  {isConnected ? 'Настроить' : 'Подключить'}
                </button>
                {isConnected && (
                  <button
                    onClick={() => handleSync(mp.value)}
                    disabled={syncing === mp.value}
                    className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center disabled:opacity-50"
                    title="Синхронизировать"
                  >
                    <HiRefresh
                      className={`h-4 w-4 ${syncing === mp.value ? 'animate-spin' : ''}`}
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMarketplace(null);
        }}
        title={
          editingMarketplace
            ? `Настройка подключения: ${marketplaces.find((m) => m.value === editingMarketplace)?.label}`
            : 'Настройка подключения'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
            <p className="font-medium mb-1">Инструкция по получению API ключей:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong>Avito:</strong> Личный кабинет → API → Создать приложение
              </li>
              <li>
                <strong>Ozon:</strong> Личный кабинет продавца → Настройки → API ключи
              </li>
              <li>
                <strong>Wildberries:</strong> Личный кабинет → Настройки → Доступ к API
              </li>
              <li>
                <strong>Яндекс Маркет:</strong> Личный кабинет → Настройки → API
              </li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              {...register('api_key')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Введите API ключ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Secret
            </label>
            <input
              {...register('api_secret')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Введите API секрет"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                {...register('client_id')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Client ID (если требуется)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret
              </label>
              <input
                {...register('client_secret')}
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Client Secret (если требуется)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token
            </label>
            <input
              {...register('access_token')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Access Token (если требуется)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refresh Token
            </label>
            <input
              {...register('refresh_token')}
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Refresh Token (если требуется)"
            />
          </div>

          <div className="flex items-center">
            <input
              {...register('is_active')}
              type="checkbox"
              id="is_active"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Активировать подключение
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingMarketplace(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MarketplaceSettings;

