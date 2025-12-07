import React, { useEffect, useState } from 'react';
import api from '../../api/axios.config';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  activeClients: number;
  activeListings: number;
  totalViews: number;
  totalRevenue: number;
  chartData: Array<{ date: string; views: number }>;
  topProducts: Array<{ id: number; name: string; views: number }>;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка данных...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Форматирование дат для графика
  const formattedChartData = data.chartData.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Дашборд</h1>
      
      {/* Карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Активные клиенты</h3>
          <p className="text-3xl font-bold text-gray-900">{data.activeClients}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Активные объявления</h3>
          <p className="text-3xl font-bold text-gray-900">{data.activeListings}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Просмотры за месяц</h3>
          <p className="text-3xl font-bold text-gray-900">{data.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Доход за месяц</h3>
          <p className="text-3xl font-bold text-gray-900">{data.totalRevenue.toLocaleString()} ₽</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* График просмотров */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Просмотры за последние 30 дней
          </h2>
          {formattedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formattedChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Нет данных за последние 30 дней
            </div>
          )}
        </div>

        {/* Топ-5 товаров */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Топ-5 товаров по просмотрам
          </h2>
          {data.topProducts.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-indigo-600 mr-3">
                      #{index + 1}
                    </span>
                    <span className="text-gray-900">{product.name}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-700">
                    {product.views.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Нет данных о товарах
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
