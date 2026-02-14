import React, { useEffect, useState } from 'react';
import { Search, PlusCircle, RefreshCw, MapPin, Home, Edit2, Trash2, X, AlertCircle, Loader2, User, Mail, Phone, Calendar, Hash } from 'lucide-react';
import { supabase } from '../../supabase';

const AspirantPanel = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeat, setFilterSeat] = useState('all');
    const [aspirants, setAspirants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registrations, setRegistrations] = useState([]);
    const [votes, setVotes] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [stats, setStats] = useState({
        totalVotes: 0,
        totalVoters: 0,
        totalAspirants: 0,
        pendingRegistrations: 0,
        approvedRegistrations: 0,
        rejectedRegistrations: 0
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAspirant, setEditingAspirant] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        party: '',
        seat: 'MP',
        county: '',
        constituency: '',
        ward: ''
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [showVoterModal, setShowVoterModal] = useState(false);
    const [selectedAspirant, setSelectedAspirant] = useState(null);
    const [voterDetails, setVoterDetails] = useState([]);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [voterSearchTerm, setVoterSearchTerm] = useState('');

    const seats = [
        'Presidential',
        'Governor',
        'Senator',
        'MP',
        'Women Rep',
        'MCA'
    ];

    const counties = [
        'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu',
        'Kakamega', 'Bungoma', 'Siaya', 'Kisii', 'Nyamira',
        'Migori', 'Homa Bay', 'Kericho', 'Bomet', 'Nandi',
        'Trans Nzoia', 'West Pokot', 'Turkana', 'Marsabit', 'Mandera',
        'Wajir', 'Garissa', 'Tana River', 'Lamu', 'Kilifi',
        'Kwale', 'Taita Taveta', 'Makueni', 'Machakos', 'Kitui',
        'Meru', 'Tharaka Nithi', 'Embu', 'Kirinyaga', 'Muranga',
        'Kiambu', 'Nyandarua', 'Nyeri', 'Laikipia', 'Samburu',
        'Isiolo', 'Elgeyo Marakwet', 'Baringo', 'Narok', 'Kajiado'
    ];

    useEffect(() => {
        fetchData();
        const subscription = setupRealtimeSubscription();
        return () => subscription?.unsubscribe();
    }, []);

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    const setupRealtimeSubscription = () => {
        try {
            const subscription = supabase
                .channel('admin-dashboard')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'user_votes' },
                    payload => {
                        console.log('New vote:', payload);
                        fetchData();
                    }
                )
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'aspirants' },
                    () => fetchData()
                )
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'profiles' },
                    () => fetchData()
                )
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'aspirant_registrations' },
                    () => fetchData()
                )
                .subscribe();

            return subscription;
        } catch (err) {
            console.error('Realtime subscription error:', err);
            return null;
        }
    };

    const handleResetVotes = async () => {
        if (!window.confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('user_votes')
                .delete()
                .not('aspirant_id', 'is', null);


            if (error) throw error;
            setSuccess('All votes have been reset successfully.');
            fetchData();

        } catch (error) {
            console.error('Error resetting votes:', error);
            setError('Failed to reset votes. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: aspirantsData, error: aspirantsError } = await supabase
                .from('aspirants')
                .select('*')
                .order('created_at', { ascending: false });

            if (aspirantsError) throw aspirantsError;
            setAspirants(aspirantsData || []);


            const { data: registrationsData, error: registrationsError } = await supabase
                .from('aspirant_registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (registrationsError) throw registrationsError;
            setRegistrations(registrationsData || []);
            const { data: votesData, error: votesError } = await supabase
                .from('user_votes')
                .select('aspirant_id');

            if (votesError) throw votesError;

            const voteCounts = {};
            (votesData || []).forEach(v => {
                voteCounts[v.aspirant_id] = (voteCounts[v.aspirant_id] || 0) + 1;
            });
            setVotes(voteCounts);

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;
            setProfiles(profilesData || []);

            const totalVotes = (votesData || []).length;
            const pendingRegistrations = (registrationsData || []).filter(r => r.status === 'pending').length;
            const approvedRegistrations = (registrationsData || []).filter(r => r.status === 'approved').length;
            const rejectedRegistrations = (registrationsData || []).filter(r => r.status === 'rejected').length;

            setStats({
                totalVotes,
                totalVoters: (profilesData || []).length,
                totalAspirants: (aspirantsData || []).length,
                pendingRegistrations,
                approvedRegistrations,
                rejectedRegistrations
            });

        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load data. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAspirant = async (e) => {
        e.preventDefault();

        // Clear previous errors
        setError(null);

        // Basic validation
        if (!formData.name.trim() || !formData.party.trim() || !formData.seat || !formData.county) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);

        try {
            const { data, error: insertError } = await supabase
                .from('aspirants')
                .insert([{
                    name: formData.name.trim(),
                    party: formData.party.trim(),
                    seat: formData.seat,
                    county: formData.county,
                    constituency: formData.constituency.trim() || null,
                    ward: formData.ward.trim() || null,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (insertError) throw insertError;

            setSuccess('Candidate added successfully!');
            setShowAddModal(false);
            setFormData({
                name: '',
                party: '',
                seat: 'MP',
                county: '',
                constituency: '',
                ward: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error adding aspirant:', error);
            setError(`Failed to add candidate: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleEditAspirant = async (e) => {
        e.preventDefault();

        if (!editingAspirant) return;


        setError(null);

        // Basic validation
        if (!formData.name.trim() || !formData.party.trim() || !formData.seat || !formData.county) {
            setError('Please fill in all required fields.');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase
                .from('aspirants')
                .update({
                    name: formData.name.trim(),
                    party: formData.party.trim(),
                    seat: formData.seat,
                    county: formData.county,
                    constituency: formData.constituency.trim() || null,
                    ward: formData.ward.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingAspirant.id);

            if (updateError) throw updateError;

            setSuccess('Candidate updated successfully!');
            setShowEditModal(false);
            setEditingAspirant(null);
            setFormData({
                name: '',
                party: '',
                seat: 'MP',
                county: '',
                constituency: '',
                ward: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error updating aspirant:', error);
            setError(`Failed to update candidate: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAspirant = async (id) => {
        if (!window.confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('aspirants')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccess('Candidate deleted successfully!');
            fetchData();
        } catch (error) {
            console.error('Error deleting aspirant:', error);
            setError('Failed to delete candidate. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    const fetchVoterDetails = async (aspirantId) => {
        try {
            setLoadingVoters(true);

            const { data: votesData, error: votesError } = await supabase
                .from('user_votes')
                .select('user_id, voted_at')
                .eq('aspirant_id', aspirantId)
                .order('voted_at', { ascending: false });

            if (votesError) throw votesError;

            if (!votesData || votesData.length === 0) {
                setVoterDetails([]);
                return;
            }


            const userIds = votesData.map(vote => vote.user_id);

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds);

            if (profilesError) throw profilesError;
            const combinedData = votesData.map(vote => {
                const profile = profilesData?.find(p => p.id === vote.user_id);
                return {
                    userId: vote.user_id,
                    votedAt: vote.voted_at,
                    profile: profile || null
                };
            });

            setVoterDetails(combinedData);
        } catch (error) {
            console.error('Error fetching voter details:', error);
            setError('Failed to load voter details');
        } finally {
            setLoadingVoters(false);
        }
    };

    // Handle row click to show voter details
    const handleRowClick = async (aspirant) => {
        setSelectedAspirant(aspirant);
        setShowVoterModal(true);
        setVoterSearchTerm('');
        await fetchVoterDetails(aspirant.id);
    };

    const filteredAspirants = aspirants.filter(aspirant => {
        const matchesSearch = searchTerm === '' ||
            aspirant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aspirant.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aspirant.county.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSeat = filterSeat === 'all' || aspirant.seat === filterSeat;

        return matchesSearch && matchesSeat;
    });

    // Filter voter details based on search
    const filteredVoterDetails = voterDetails.filter(voter => {
        if (!voter.profile) return false;

        const searchLower = voterSearchTerm.toLowerCase();
        return (
            voter.profile.full_name?.toLowerCase().includes(searchLower) ||
            voter.profile.id_number?.toLowerCase().includes(searchLower) ||
            voter.profile.phone_number?.toLowerCase().includes(searchLower) ||
            voter.profile.email?.toLowerCase().includes(searchLower) ||
            voter.profile.county?.toLowerCase().includes(searchLower) ||
            voter.profile.constituency?.toLowerCase().includes(searchLower) ||
            voter.profile.ward?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="flex-1 flex flex-col min-h-0">

            <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
                {/* Scrollable content area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    {/* Notifications - keep at top, not scrollable */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{error}</p>
                            </div>
                            <button
                                onClick={() => setError(null)}
                                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{success}</p>
                            </div>
                            <button
                                onClick={() => setSuccess(null)}
                                className="p-1 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Total Votes</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalVotes.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Total Voters</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalVoters.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Total Candidates</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalAspirants.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Pending Registrations</p>
                            <p className="text-2xl font-black text-slate-900">{stats.pendingRegistrations.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Action Bar - Fixed height, not scrollable */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search candidates..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <select
                                value={filterSeat}
                                onChange={(e) => setFilterSeat(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="all">All Positions</option>
                                {seats.map(seat => (
                                    <option key={seat} value={seat}>{seat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                                disabled={loading}
                            >
                                <PlusCircle size={18} />
                                Add Candidate
                            </button>
                            <button
                                onClick={handleResetVotes}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-600/20"
                                disabled={loading}
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                Reset Votes
                            </button>
                        </div>
                    </div>

                    {/* Aspirants Table - Scrollable area */}
                    <div className="flex-1 min-h-0">
                        {/* Loading State */}
                        {loading && aspirants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                                <p className="font-bold uppercase tracking-widest text-xs">Loading candidates...</p>
                            </div>
                        ) : (
                            /* Aspirants Table Container */
                            <div className="flex-1 min-h-0">
                                <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
                                    {/* Table with fixed header and scrollable body */}
                                    <div className="overflow-hidden flex-1 min-h-0">
                                        <div className="overflow-auto h-full">
                                            <table className="w-full">
                                                <thead className="bg-linear-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Candidate</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Party</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Position</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Votes</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {filteredAspirants.map(aspirant => {
                                                        const voteCount = votes[aspirant.id] ?? 0;
                                                        const maxVotes = Object.values(votes).length > 0 ? Math.max(...Object.values(votes)) : 1;
                                                        const percentage = (voteCount / maxVotes) * 100;

                                                        return (
                                                            <tr
                                                                key={aspirant.id}
                                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                                onClick={() => handleRowClick(aspirant)}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold">
                                                                            {aspirant.name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900">{aspirant.name}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                                                        {aspirant.party}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="font-medium text-gray-900">{aspirant.seat}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-1 text-sm">
                                                                            <MapPin size={12} />
                                                                            <span>{aspirant.county}</span>
                                                                        </div>
                                                                        {aspirant.constituency && (
                                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                                <Home size={12} />
                                                                                <span>{aspirant.constituency}</span>
                                                                            </div>
                                                                        )}
                                                                        {aspirant.ward && (
                                                                            <div className="text-xs text-gray-400 pl-3">
                                                                                {aspirant.ward} Ward
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="space-y-1">
                                                                        <p className="text-lg font-bold text-gray-900">
                                                                            {voteCount.toLocaleString()} votes
                                                                        </p>
                                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                                            <div
                                                                                className="bg-linear-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000"
                                                                                style={{ width: `${Math.min(100, percentage)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingAspirant(aspirant);
                                                                                setFormData({
                                                                                    name: aspirant.name,
                                                                                    party: aspirant.party,
                                                                                    seat: aspirant.seat,
                                                                                    county: aspirant.county,
                                                                                    constituency: aspirant.constituency || '',
                                                                                    ward: aspirant.ward || ''
                                                                                });
                                                                                setShowEditModal(true);
                                                                            }}
                                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                            title="Edit"
                                                                            disabled={loading}
                                                                        >
                                                                            <Edit2 size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteAspirant(aspirant.id)}
                                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="Delete"
                                                                            disabled={loading}
                                                                        >
                                                                            <Trash2 size={18} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {filteredAspirants.length === 0 && !loading && (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500 font-medium">No candidates found matching your criteria.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Voter Details Modal */}
            {showVoterModal && selectedAspirant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Voters for {selectedAspirant.name}
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">
                                    {selectedAspirant.party} • {selectedAspirant.seat} • {selectedAspirant.county}
                                </p>
                                <p className="text-blue-600 font-bold text-sm mt-1">
                                    Total Votes: {(votes[selectedAspirant.id] || 0).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowVoterModal(false);
                                    setSelectedAspirant(null);
                                    setVoterDetails([]);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Search bar in modal */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search voters by name, ID, phone, or location..."
                                    value={voterSearchTerm}
                                    onChange={(e) => setVoterSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Voter list with scrolling */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingVoters ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                                    <p className="font-bold uppercase tracking-widest text-xs text-gray-500">
                                        Loading voter details...
                                    </p>
                                </div>
                            ) : filteredVoterDetails.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <User size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 font-medium">
                                        {voterSearchTerm
                                            ? 'No voters found matching your search'
                                            : 'No votes recorded for this candidate yet'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredVoterDetails.map((voter, index) => (
                                        <div
                                            key={`${voter.userId}-${voter.votedAt}`}
                                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                                        >
                                            {voter.profile ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="h-12 w-12 rounded-full bg-linear-to-br from-green-100 to-emerald-100 flex items-center justify-center text-green-600 font-bold text-lg shrink-0">
                                                            {voter.profile.full_name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-900">
                                                                {voter.profile.full_name || 'Unnamed Voter'}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                                <Hash size={12} />
                                                                <span>ID: {voter.profile.id_number || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Mail size={14} className="text-gray-400" />
                                                            <span className="text-gray-600 truncate">
                                                                {voter.profile.email || 'No email'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Phone size={14} className="text-gray-400" />
                                                            <span className="text-gray-600">
                                                                {voter.profile.phone_number || 'No phone'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <MapPin size={14} className="text-gray-400" />
                                                            <span className="text-gray-600">
                                                                {voter.profile.county}, {voter.profile.constituency}
                                                            </span>
                                                        </div>

                                                        {voter.profile.ward && (
                                                            <div className="text-xs text-gray-500 pl-6">
                                                                {voter.profile.ward} Ward
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-2 border-t border-gray-100">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Voted on: {new Date(voter.votedAt).toLocaleDateString()} at {new Date(voter.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg shrink-0">
                                                            ?
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">Anonymous Voter</h4>
                                                            <p className="text-sm text-gray-500">User ID: {voter.userId.substring(0, 8)}...</p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-gray-100">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Voted on: {new Date(voter.votedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500">
                                Showing {filteredVoterDetails.length} of {voterDetails.length} voters
                                {voterSearchTerm && ' matching search'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Candidate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                            <h3 className="text-xl font-bold text-gray-900">Add New Candidate</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddAspirant} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Political Party *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.party}
                                        onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Party Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Position *</label>
                                    <select
                                        required
                                        value={formData.seat}
                                        onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        {seats.map(seat => (
                                            <option key={seat} value={seat}>{seat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">County *</label>
                                    <select
                                        required
                                        value={formData.county}
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select County</option>
                                        {counties.map(county => (
                                            <option key={county} value={county}>{county}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Constituency (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.constituency}
                                        onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Constituency Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ward (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Ward Name"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                                    {loading ? 'Adding...' : 'Add Candidate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Candidate Modal */}
            {showEditModal && editingAspirant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                            <h3 className="text-xl font-bold text-gray-900">Edit Candidate</h3>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingAspirant(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleEditAspirant} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Political Party *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.party}
                                        onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Position *</label>
                                    <select
                                        required
                                        value={formData.seat}
                                        onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        {seats.map(seat => (
                                            <option key={seat} value={seat}>{seat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">County *</label>
                                    <select
                                        required
                                        value={formData.county}
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select County</option>
                                        {counties.map(county => (
                                            <option key={county} value={county}>{county}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Constituency (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.constituency}
                                        onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ward (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingAspirant(null);
                                    }}
                                    className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Edit2 size={18} />}
                                    {loading ? 'Updating...' : 'Update Candidate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AspirantPanel;