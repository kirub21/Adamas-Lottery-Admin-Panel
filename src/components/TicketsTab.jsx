import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function TicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [draws, setDraws] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    ticket_number: '', 
    draw_id: '', 
    status: 'active', 
    source: 'Manual',
    prize_amount: ''
  });
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (amount == null) return '0 ETB';
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const fetchDraws = async () => {
    try {
      const { data, error } = await supabase
        .from('draws')
        .select('id, draw_date, jackpot_amount, status')
        .order('draw_date', { ascending: false });
      if (error) throw error;
      setDraws(data);
    } catch (error) {
      console.error('Error fetching draws:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *, 
          users(email, full_name),
          draws(draw_date, jackpot_amount, status)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('Fetched tickets:', data);
      const invalidRecords = data.filter(t => t.draws == null || t.users == null || t.draw_id == null);
      if (invalidRecords.length > 0) {
        console.warn('Invalid ticket records:', invalidRecords);
      }
      setTickets(data);
      setFilteredTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setFormError('Error fetching tickets: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraws();
    fetchTickets();
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = tickets;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.source === sourceFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.ticket_number.includes(searchTerm) ||
        (ticket.users?.email?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) ||
        (ticket.users?.full_name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) ||
        ticket.id.toString().includes(searchTerm) ||
        (ticket.draws?.draw_date?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false)
      );
    }

    setFilteredTickets(filtered);
    setCurrentPage(1);
  }, [tickets, searchTerm, statusFilter, sourceFilter]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTickets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  const handleEdit = (ticket) => {
    setEditingId(ticket.id);
    setFormData({
      ticket_number: ticket.ticket_number,
      draw_id: ticket.draw_id?.toString() ?? '',
      status: ticket.status ?? 'active',
      source: ticket.source ?? 'Manual',
      prize_amount: ticket.prize_amount ? ticket.prize_amount.toString() : '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.draw_id || !draws.some(draw => draw.id.toString() === formData.draw_id)) {
      setFormError('Please select a valid draw');
      return;
    }

    try {
      const updateData = {
        ticket_number: formData.ticket_number,
        draw_id: parseInt(formData.draw_id),
        status: formData.status,
        source: formData.source,
      };

      // Only include prize_amount if it's provided
      if (formData.prize_amount) {
        updateData.prize_amount = parseFloat(formData.prize_amount);
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', editingId);
      
      if (error) throw error;
      console.log('Ticket updated:', editingId);
      alert('Ticket updated successfully');
      setEditingId(null);
      setFormData({ ticket_number: '', draw_id: '', status: 'active', source: 'Manual', prize_amount: '' });
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      setFormError(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      try {
        const { error } = await supabase.from('tickets').delete().eq('id', id);
        if (error) throw error;
        console.log('Ticket deleted:', id);
        alert('Ticket deleted successfully');
        fetchTickets();
      } catch (error) {
        console.error('Error deleting ticket:', error);
        alert('Error deleting ticket: ' + error.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ ticket_number: '', draw_id: '', status: 'active', source: 'Manual', prize_amount: '' });
    setFormError(null);
  };

  const getStatusStats = () => {
    const active = tickets.filter(t => t.status === 'active').length;
    const winner = tickets.filter(t => t.status === 'winner').length;
    const expired = tickets.filter(t => t.status === 'expired').length;
    return { active, winner, expired };
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Manage Tickets</h2>
        <div className="text-sm text-gray-500">
          Total: {filteredTickets.length} tickets
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <div className="w-6 h-6 bg-yellow-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Winners</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.winner}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gray-100">
              <div className="w-6 h-6 bg-gray-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Expired</p>
              <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {editingId && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Edit Ticket</h3>
          </div>
          <form onSubmit={handleUpdate} className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket Number *
                </label>
                <input
                  type="text"
                  value={formData.ticket_number}
                  onChange={(e) => setFormData({ ...formData, ticket_number: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Draw *
                </label>
                <select
                  value={formData.draw_id}
                  onChange={(e) => setFormData({ ...formData, draw_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Select a draw</option>
                  {draws.map((draw) => (
                    <option key={draw.id} value={draw.id}>
                      {formatDate(draw.draw_date)} - {formatCurrency(draw.jackpot_amount)} ({draw.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="active">Active</option>
                  <option value="winner">Winner</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source *
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="SMS">SMS</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prize Amount (ETB)
                </label>
                <input
                  type="number"
                  value={formData.prize_amount}
                  onChange={(e) => setFormData({ ...formData, prize_amount: e.target.value })}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
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
                Update Ticket
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Tickets
            </label>
            <input
              type="text"
              placeholder="Search by ticket number, user email, name, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="winner">Winner</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">All Sources</option>
              <option value="SMS">SMS</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Draw Info
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prize
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{ticket.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{ticket.users?.email ?? 'N/A'}</div>
                      {ticket.users?.full_name && (
                        <div className="text-gray-500 text-xs">{ticket.users.full_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 bg-gray-50 rounded px-2 py-1">
                    {ticket.ticket_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{ticket.draws ? formatDate(ticket.draws.draw_date) : 'N/A'}</div>
                      <div className="text-xs text-gray-500">
                        {ticket.draws ? formatCurrency(ticket.draws.jackpot_amount) : 'N/A'}
                      </div>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        ticket.draws ? (
                          ticket.draws.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.draws.status === 'active' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        ) : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.draws?.status ?? 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      ticket.status === 'active' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'winner' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      ticket.source === 'SMS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {ticket.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {ticket.prize_amount ? formatCurrency(ticket.prize_amount) : '0 ETB'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(ticket)}
                      className="bg-yellow-500 text-white px-3 py-1.5 rounded-md hover:bg-yellow-600 transition-colors text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ticket.id)}
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTickets.length)} of {filteredTickets.length} results
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
            <div className="text-gray-400 text-lg mb-2">No tickets found</div>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketsTab;