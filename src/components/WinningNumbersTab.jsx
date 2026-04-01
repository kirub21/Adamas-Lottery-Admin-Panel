import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function WinningNumbersTab() {
  const [winningNumbers, setWinningNumbers] = useState([]);
  const [filteredNumbers, setFilteredNumbers] = useState([]);
  const [draws, setDraws] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [drawFilter, setDrawFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    draw_id: '',
    winning_number: '',
    position: '',
    prize_amount: '',
  });
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkNumbers, setBulkNumbers] = useState('');

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

  const fetchWinningNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('winning_numbers')
        .select(`
          id, 
          draw_id, 
          winning_number, 
          position, 
          prize_amount, 
          created_at,
          draws (
            id,
            draw_date,
            jackpot_amount,
            status
          )
        `)
        .not('draw_id', 'is', null) // Exclude records with null draw_id
        .not('draws', 'is', null) // Exclude records with null draws
        .order('created_at', { ascending: false });
      if (error) throw error;
      console.log('Fetched winning numbers:', data);
      const invalidRecords = data.filter(wn => wn.draw_id == null || wn.draws == null);
      if (invalidRecords.length > 0) {
        console.warn('Invalid winning numbers records:', invalidRecords);
      }
      setWinningNumbers(data);
      setFilteredNumbers(data);
    } catch (error) {
      console.error('Error fetching winning numbers:', error);
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraws();
    fetchWinningNumbers();
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = winningNumbers;

    // Apply draw filter
    if (drawFilter !== 'all') {
      filtered = filtered.filter(wn => wn.draw_id.toString() === drawFilter);
    }

    // Apply position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(wn => wn.position.toString() === positionFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(wn =>
        wn.winning_number.includes(searchTerm) ||
        wn.position.toString().includes(searchTerm) ||
        (wn.draws?.draw_date?.includes(searchTerm) ?? false)
      );
    }

    setFilteredNumbers(filtered);
    setCurrentPage(1);
  }, [winningNumbers, searchTerm, positionFilter, drawFilter]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNumbers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNumbers.length / itemsPerPage);

  const validateWinningNumber = (number) => {
    return /^\d{3}-\d{7}$/.test(number);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    
    if (!formData.draw_id || !draws.some(draw => draw.id.toString() === formData.draw_id)) {
      setFormError('Please select a valid draw');
      return;
    }
    
    if (!validateWinningNumber(formData.winning_number)) {
      setFormError('Winning number must be in format XXX-YYYYYYY (e.g., 212-1212121)');
      return;
    }
    if (!formData.position.match(/^[1-9]$|^10$/)) {
      setFormError('Position must be between 1 and 10');
      return;
    }

    // Check for duplicate position in the same draw
    const existingPosition = winningNumbers.find(wn => 
      wn.draw_id.toString() === formData.draw_id && 
      wn.position.toString() === formData.position &&
      wn.id !== editingId
    );
    
    if (existingPosition) {
      setFormError(`Position ${formData.position} already exists for this draw`);
      return;
    }

    try {
      if (editingId) {
        // Update existing winning number
        const { error } = await supabase
          .from('winning_numbers')
          .update({
            draw_id: parseInt(formData.draw_id),
            winning_number: formData.winning_number,
            position: parseInt(formData.position),
            prize_amount: parseFloat(formData.prize_amount),
          })
          .eq('id', editingId);
        if (error) throw error;
        alert('Winning number updated successfully');
        setEditingId(null);
      } else {
        // Create new winning number
        const { error } = await supabase
          .from('winning_numbers')
          .insert([{
            draw_id: parseInt(formData.draw_id),
            winning_number: formData.winning_number,
            position: parseInt(formData.position),
            prize_amount: parseFloat(formData.prize_amount),
          }]);
        if (error) throw error;
        alert('Winning number created successfully');
      }
      setFormData({ draw_id: '', winning_number: '', position: '', prize_amount: '' });
      fetchWinningNumbers();
    } catch (error) {
      console.error('Error submitting winning number:', error);
      setFormError(error.message);
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.draw_id || !draws.some(draw => draw.id.toString() === formData.draw_id)) {
      setFormError('Please select a valid draw');
      return;
    }

    const lines = bulkNumbers.trim().split('\n');
    const numbersToAdd = [];
    const errors = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split(',');
      if (parts.length !== 3) {
        errors.push(`Line ${index + 1}: Must have format "number,position,prize"`);
        return;
      }

      const [number, position, prize] = parts.map(p => p.trim());
      
      if (!validateWinningNumber(number)) {
        errors.push(`Line ${index + 1}: Invalid number format (use XXX-YYYYYYY)`);
        return;
      }

      const pos = parseInt(position);
      if (pos < 1 || pos > 10) {
        errors.push(`Line ${index + 1}: Position must be 1-10`);
        return;
      }

      const prizeAmount = parseFloat(prize);
      if (isNaN(prizeAmount) || prizeAmount < 0) {
        errors.push(`Line ${index + 1}: Invalid prize amount`);
        return;
      }

      numbersToAdd.push({
        draw_id: parseInt(formData.draw_id),
        winning_number: number,
        position: pos,
        prize_amount: prizeAmount
      });
    });

    if (errors.length > 0) {
      setFormError(errors.join('\n'));
      return;
    }

    // Check for duplicate positions
    const positions = numbersToAdd.map(n => n.position);
    const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
    if (duplicatePositions.length > 0) {
      setFormError(`Duplicate positions found: ${duplicatePositions.join(', ')}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('winning_numbers')
        .insert(numbersToAdd);
      
      if (error) throw error;
      
      alert(`Successfully added ${numbersToAdd.length} winning numbers`);
      setBulkNumbers('');
      setShowBulkAdd(false);
      fetchWinningNumbers();
    } catch (error) {
      console.error('Error bulk adding winning numbers:', error);
      setFormError(error.message);
    }
  };

  const handleEdit = (wn) => {
    setEditingId(wn.id);
    setFormData({
      draw_id: wn.draw_id.toString(),
      winning_number: wn.winning_number,
      position: wn.position.toString(),
      prize_amount: wn.prize_amount.toString(),
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this winning number? This action cannot be undone.')) {
      try {
        const { error } = await supabase.from('winning_numbers').delete().eq('id', id);
        if (error) throw error;
        alert('Winning number deleted successfully');
        fetchWinningNumbers();
      } catch (error) {
        console.error('Error deleting winning number:', error);
        alert('Error deleting winning number: ' + error.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ draw_id: '', winning_number: '', position: '', prize_amount: '' });
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

  const getPositionBadgeColor = (position) => {
    if (position <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (position <= 6) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getDrawStatusBadge = (status) => {
    const colors = {
      upcoming: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAvailablePositions = (drawId) => {
    const usedPositions = winningNumbers
      .filter(wn => wn.draw_id != null && wn.draw_id.toString() === drawId && wn.id !== editingId)
      .map(wn => wn.position);
    
    return [...Array(10)].map((_, i) => i + 1).filter(pos => !usedPositions.includes(pos));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Manage Winning Numbers</h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkAdd(!showBulkAdd)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            {showBulkAdd ? 'Hide Bulk Add' : 'Bulk Add Numbers'}
          </button>
          <div className="text-sm text-gray-500 flex items-center">
            Total: {filteredNumbers.length} winning numbers
          </div>
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
              <p className="text-sm font-medium text-gray-500">Total Numbers</p>
              <p className="text-2xl font-bold text-gray-900">{winningNumbers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <div className="w-6 h-6 bg-yellow-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Top 3 Positions</p>
              <p className="text-2xl font-bold text-yellow-600">
                {winningNumbers.filter(wn => wn.position <= 3).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Draws</p>
              <p className="text-2xl font-bold text-green-600">
                {draws.filter(d => d.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Prize Pool</p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(winningNumbers.reduce((sum, wn) => sum + wn.prize_amount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Add Form */}
      {showBulkAdd && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Add Winning Numbers</h3>
            <p className="text-sm text-gray-600 mt-1">
              Add multiple winning numbers at once. Format: number,position,prize (one per line)
            </p>
          </div>
          <form onSubmit={handleBulkAdd} className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Draw *
                </label>
                <select
                  value={formData.draw_id}
                  onChange={(e) => setFormData({ ...formData, draw_id: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                  Example Format
                </label>
                <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono text-gray-600">
                  212-1234567,1,100000<br/>
                  213-7654321,2,50000<br/>
                  214-9876543,3,25000
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Winning Numbers (one per line) *
              </label>
              <textarea
                value={bulkNumbers}
                onChange={(e) => setBulkNumbers(e.target.value)}
                rows={8}
                placeholder="212-1234567,1,100000
213-7654321,2,50000
214-9876543,3,25000"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
              />
            </div>
            {formError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <pre className="text-red-600 text-sm whitespace-pre-wrap">{formError}</pre>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Add All Numbers
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkAdd(false);
                  setBulkNumbers('');
                  setFormError(null);
                }}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Winning Number' : 'Add New Winning Number'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Draw *
              </label>
              <select
                value={formData.draw_id}
                onChange={(e) => setFormData({ ...formData, draw_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                Winning Number *
              </label>
              <input
                type="text"
                value={formData.winning_number}
                onChange={(e) => setFormData({ ...formData, winning_number: e.target.value })}
                placeholder="e.g., 212-1212121"
                pattern="^\d{3}-\d{7}$"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Format: XXX-YYYYYYY</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position (1-10) *
              </label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Select Position</option>
                {formData.draw_id && draws.some(draw => draw.id.toString() === formData.draw_id) ? (
                  getAvailablePositions(formData.draw_id).map((pos) => (
                    <option key={pos} value={pos}>
                      Position {pos}
                    </option>
                  ))
                ) : (
                  [...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Position {i + 1}
                    </option>
                  ))
                )}
              </select>
              {formData.draw_id && getAvailablePositions(formData.draw_id).length === 0 && (
                <p className="text-xs text-red-500 mt-1">All positions filled for this draw</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prize Amount (ETB) *
              </label>
              <input
                type="number"
                value={formData.prize_amount}
                onChange={(e) => setFormData({ ...formData, prize_amount: e.target.value })}
                step="0.01"
                min="0"
                required
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
              disabled={formData.draw_id && getAvailablePositions(formData.draw_id).length === 0 && !editingId}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Update Winning Number' : 'Add Winning Number'}
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
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Winning Numbers
            </label>
            <input
              type="text"
              placeholder="Search by number, position, or draw date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Draw
            </label>
            <select
              value={drawFilter}
              onChange={(e) => setDrawFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">All Draws</option>
              {draws.map((draw) => (
                <option key={draw.id} value={draw.id}>
                  {formatDate(draw.draw_date)}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Position
            </label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">All Positions</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Position {i + 1}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Winning Numbers Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading winning numbers...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Draw Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Winning Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prize Amount
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
                {currentItems.map((wn) => (
                  <tr key={wn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{wn.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {wn.draws ? formatDate(wn.draws.draw_date) : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {wn.draws ? formatCurrency(wn.draws.jackpot_amount) : 'N/A'}
                        </div>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${wn.draws ? getDrawStatusBadge(wn.draws.status) : 'bg-gray-100 text-gray-800'}`}>
                          {wn.draws ? wn.draws.status : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      <span className="bg-gray-50 px-3 py-1 rounded-lg border">
                        {wn.winning_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getPositionBadgeColor(wn.position)}`}>
                        #{wn.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(wn.prize_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(wn.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(wn)}
                        className="bg-yellow-500 text-white px-3 py-1.5 rounded-md hover:bg-yellow-600 transition-colors text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(wn.id)}
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredNumbers.length)} of {filteredNumbers.length} results
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
              <div className="text-gray-400 text-lg mb-2">No winning numbers found</div>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WinningNumbersTab;