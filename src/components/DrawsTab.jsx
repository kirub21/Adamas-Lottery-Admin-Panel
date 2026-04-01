import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function DrawsTab() {
  const [draws, setDraws] = useState([]);
  const [filteredDraws, setFilteredDraws] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    draw_date: '',
    jackpot_amount: '',
    status: 'upcoming',
  });
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchDraws = async () => {
    try {
      const { data, error } = await supabase
        .from('draws')
        .select('id, draw_date, jackpot_amount, status, created_at')
        .order('draw_date', { ascending: false });
      if (error) throw error;
      console.log('Fetched draws:', data);
      setDraws(data);
      setFilteredDraws(data);
    } catch (error) {
      console.error('Error fetching draws:', error);
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraws();
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = draws;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(draw => draw.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(draw =>
        draw.id.toString().includes(searchTerm) ||
        draw.draw_date.includes(searchTerm) ||
        draw.jackpot_amount.toString().includes(searchTerm)
      );
    }

    setFilteredDraws(filtered);
    setCurrentPage(1);
  }, [draws, searchTerm, statusFilter]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDraws.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDraws.length / itemsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) {
        // Update existing draw
        const { error } = await supabase
          .from('draws')
          .update({
            draw_date: formData.draw_date,
            jackpot_amount: parseFloat(formData.jackpot_amount),
            status: formData.status,
          })
          .eq('id', editingId);
        if (error) throw error;
        alert('Draw updated successfully');
        setEditingId(null);
      } else {
        // Create new draw
        const { error } = await supabase
          .from('draws')
          .insert([{
            draw_date: formData.draw_date,
            jackpot_amount: parseFloat(formData.jackpot_amount),
            status: formData.status,
          }]);
        if (error) throw error;
        alert('Draw created successfully');
      }
      setFormData({ draw_date: '', jackpot_amount: '', status: 'upcoming' });
      fetchDraws();
    } catch (error) {
      console.error('Error submitting draw:', error);
      setFormError(error.message);
    }
  };

  const handleEdit = (draw) => {
    setEditingId(draw.id);
    setFormData({
      draw_date: draw.draw_date,
      jackpot_amount: draw.jackpot_amount.toString(),
      status: draw.status,
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this draw? This action cannot be undone.')) {
      try {
        const { error } = await supabase.from('draws').delete().eq('id', id);
        if (error) throw error;
        alert('Draw deleted successfully');
        fetchDraws();
      } catch (error) {
        console.error('Error deleting draw:', error);
        alert('Error deleting draw: ' + error.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ draw_date: '', jackpot_amount: '', status: 'upcoming' });
    setFormError(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Manage Draws</h2>
        <div className="text-sm text-gray-500">
          Total: {filteredDraws.length} draws
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Draw' : 'Add New Draw'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Draw Date *
              </label>
              <input
                type="date"
                value={formData.draw_date}
                onChange={(e) => setFormData({ ...formData, draw_date: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jackpot Amount (ETB) *
              </label>
              <input
                type="number"
                value={formData.jackpot_amount}
                onChange={(e) => setFormData({ ...formData, jackpot_amount: e.target.value })}
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          {formError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{formError}</p>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
            >
              {editingId ? 'Update Draw' : 'Add Draw'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Draws
            </label>
            <input
              type="text"
              placeholder="Search by ID, date, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Draws Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading draws...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Draw ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Draw Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jackpot Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((draw) => (
                  <tr key={draw.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{draw.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(draw.draw_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(draw.jackpot_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        draw.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : draw.status === 'completed' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {draw.status.charAt(0).toUpperCase() + draw.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(draw.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(draw)}
                        className="bg-yellow-500 text-white px-3 py-1.5 rounded-md hover:bg-yellow-600 transition-colors text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(draw.id)}
                        className="bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-600 transition-colors text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDraws.length)} of {filteredDraws.length} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === index + 1
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No draws found</div>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DrawsTab;