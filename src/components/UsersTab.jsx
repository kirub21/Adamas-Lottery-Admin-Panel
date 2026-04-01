import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('Fetched users:', data);
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error fetching users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Search functionality
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.phone_number && user.phone_number.includes(searchTerm)) ||
        user.id.toString().includes(searchTerm)
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchTerm]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const fetchUserTickets = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }
  };

  const handleViewUser = async (user) => {
    const tickets = await fetchUserTickets(user.id);
    setSelectedUser({ ...user, tickets });
    setShowUserDetails(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This will also delete all their tickets. This action cannot be undone.')) {
      try {
        // First delete user's tickets
        const { error: ticketsError } = await supabase
          .from('tickets')
          .delete()
          .eq('user_id', userId);
        
        if (ticketsError) throw ticketsError;

        // Then delete the user
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        if (userError) throw userError;

        alert('User and all associated tickets deleted successfully');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Manage Users</h2>
        <div className="text-sm text-gray-500">
          Total: {filteredUsers.length} users
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by email, name, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.full_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.phone_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleViewUser(user)}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors text-xs font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
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
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} results
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
            <div className="text-gray-400 text-lg mb-2">No users found</div>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">User Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">User ID:</span>
                      <p className="text-gray-900">#{selectedUser.id}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <p className="text-gray-900">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Full Name:</span>
                      <p className="text-gray-900">{selectedUser.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone Number:</span>
                      <p className="text-gray-900">{selectedUser.phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Joined:</span>
                      <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Statistics</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Total Tickets:</span>
                      <p className="text-gray-900 text-2xl font-bold">{selectedUser.tickets?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Active Tickets:</span>
                      <p className="text-green-600 text-xl font-semibold">
                        {selectedUser.tickets?.filter(t => t.status === 'active').length || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Winning Tickets:</span>
                      <p className="text-yellow-600 text-xl font-semibold">
                        {selectedUser.tickets?.filter(t => t.status === 'winner').length || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User's Tickets */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">User's Tickets</h4>
                {selectedUser.tickets && selectedUser.tickets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Ticket Number
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Draw Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Source
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Prize
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedUser.tickets.map((ticket) => (
                          <tr key={ticket.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">
                              {ticket.ticket_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(ticket.draw_date)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.status === 'active' ? 'bg-green-100 text-green-800' :
                                ticket.status === 'winner' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {ticket.source}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                              {ticket.prize_amount ? `${ticket.prize_amount.toLocaleString()} ETB` : '0 ETB'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No tickets found for this user
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersTab;