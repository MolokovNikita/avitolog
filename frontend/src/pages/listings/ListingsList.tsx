import React, { useEffect, useState } from 'react';
import api from '../../api/axios.config';
import MarketplaceLogo from '../../components/common/MarketplaceLogo';
import { Listing } from '../../types';
import { HiPencil, HiTrash } from 'react-icons/hi';
import Modal from '../../components/common/Modal';
import ListingForm from './ListingForm';

const ListingsList: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [filters, setFilters] = useState({
    marketplace: '',
    status: '',
  });

  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.marketplace) params.append('marketplace', filters.marketplace);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/listings?${params.toString()}`);
      if (response.data.success) {
        setListings(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки объявлений');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это объявление?')) {
      return;
    }
    try {
      await api.delete(`/listings/${id}`);
      fetchListings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка удаления объявления');
    }
  };

  const handleEdit = (listing: Listing) => {
    setEditingListing(listing);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingListing(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingListing(null);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingListing(null);
    fetchListings();
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/listings/${id}/status`, { status: newStatus });
      fetchListings();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка изменения статуса');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: 'Активно', className: 'bg-green-100 text-green-800' },
      draft: { label: 'Черновик', className: 'bg-gray-100 text-gray-800' },
      paused: { label: 'Приостановлено', className: 'bg-yellow-100 text-yellow-800' },
      archived: { label: 'Архив', className: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status] || statusMap.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка объявлений...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Объявления</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Создать объявление
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Маркетплейс
            </label>
            <select
              value={filters.marketplace}
              onChange={(e) => setFilters({ ...filters, marketplace: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Все</option>
              <option value="avito">Avito</option>
              <option value="ozon">Ozon</option>
              <option value="wildberries">Wildberries</option>
              <option value="yandex_market">Яндекс Маркет</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Все</option>
              <option value="active">Активно</option>
              <option value="draft">Черновик</option>
              <option value="paused">Приостановлено</option>
              <option value="archived">Архив</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ marketplace: '', status: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* Таблица объявлений */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Маркетплейс
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Товар
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Клиент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Цена
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Просмотры
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Избранное
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Нет объявлений
                </td>
              </tr>
            ) : (
              listings.map((listing: any) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MarketplaceLogo
                        marketplace={listing.marketplace}
                        className="w-8 h-8 mr-2"
                      />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {listing.marketplace.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {listing.media && listing.media.length > 0 && (
                        <img
                          src={listing.media.find((m: any) => m.is_primary)?.file_path || listing.media[0].file_path}
                          alt={listing.product_name || listing.title}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="text-sm font-medium text-gray-900">
                        {listing.product_name || listing.title || 'Без названия'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{listing.client_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {listing.price ? `${listing.price.toLocaleString()} ₽` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(listing.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{listing.views || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{listing.favorites || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-2">
                      <button
                        onClick={() => handleEdit(listing)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Редактировать"
                      >
                        <HiPencil className="h-5 w-5" />
                      </button>
                      <select
                        value={listing.status}
                        onChange={(e) => handleStatusChange(listing.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-indigo-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="draft">Черновик</option>
                        <option value="active">Активно</option>
                        <option value="paused">Приостановлено</option>
                        <option value="archived">Архив</option>
                      </select>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Удалить"
                      >
                        <HiTrash className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingListing ? 'Редактировать объявление' : 'Создать объявление'}
        size="lg"
      >
        <ListingForm
          listingId={editingListing?.id}
          onSuccess={handleSuccess}
          onCancel={handleModalClose}
        />
      </Modal>
    </div>
  );
};

export default ListingsList;

