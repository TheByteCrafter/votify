import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import {
    PlusCircle,
    Edit2,
    Trash2,
    Users,
    Vote,
    BarChart3,
    Shield,
    LogOut,
    Search,
    Filter,
    Download,
    RefreshCw,
    UserPlus,
    Award,
    MapPin,
    Home,
    CheckCircle,
    XCircle,
    Activity,
    TrendingUp,
    FileText,
    Check,
    X,
    Clock,
    UserCheck,
    FileCheck,
    Settings,
    LayoutDashboard,
    UserCog,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export default function AdminPortal() {
    const navigate = useNavigate();
    const [aspirants, setAspirants] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [votes, setVotes] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAspirant, setEditingAspirant] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeat, setFilterSeat] = useState('all');
    const [stats, setStats] = useState({
        totalVotes: 0,
        totalVoters: 0,
        totalAspirants: 0,
        pendingRegistrations: 0,
        approvedRegistrations: 0,
        rejectedRegistrations: 0
    });

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        party: '',
        seat: 'Presidential',
        county: '',
        constituency: '',
        ward: ''
    });

    // Registration modal state
    const [showRegistrationDetails, setShowRegistrationDetails] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);

    // Seats configuration
    const seats = [
        'Presidential',
        'Governor',
        'Senator',
        'MP',
        'Women Rep',
        'MCA'
    ];

    // Counties for selection
    const counties = [
        "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
        "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
        "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
        "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
        "Marsabit", "Meru", "Migori", "Mombasa", "Murang’a", "Nairobi",
        "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
        "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
        "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir",
        "West Pokot"
    ];

    // Navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'aspirants', label: 'Candidates', icon: UserCog },
        { id: 'registrations', label: 'Registrations', icon: FileCheck },
        { id: 'voters', label: 'Voters', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings }
    ];

    useEffect(() => {
        fetchData();
        setupRealtimeSubscription();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch aspirants
            const { data: aspirantsData } = await supabase
                .from('aspirants')
                .select('*')
                .order('created_at', { ascending: false });

            if (aspirantsData) setAspirants(aspirantsData);

            // Fetch aspirant registrations
            const { data: registrationsData } = await supabase
                .from('aspirant_registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (registrationsData) setRegistrations(registrationsData);

            // Fetch votes from the new users_votes table
            //
            const { data: votesData } = await supabase
                .from('user_votes')
                .select('aspirant_id');

            if (votesData) {
                // Build counts object
                const counts = {};
                votesData.forEach(v => {
                    counts[v.aspirant_id] = (counts[v.aspirant_id] || 0) + 1;
                });
                setVotes(counts);
            }


            // Fetch profiles
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesData) setProfiles(profilesData);

            const totalVotes = (votesData || [])
                .reduce((sum, vote) => sum + 1, 0);
            const pendingRegistrations = registrationsData?.filter(r => r.status === 'pending').length || 0;
            const approvedRegistrations = registrationsData?.filter(r => r.status === 'approved').length || 0;
            const rejectedRegistrations = registrationsData?.filter(r => r.status === 'rejected').length || 0;

            setStats({
                totalVotes,
                totalVoters: profilesData?.length || 0,
                totalAspirants: aspirantsData?.length || 0,
                pendingRegistrations,
                approvedRegistrations,
                rejectedRegistrations
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };


    // Add this state for trends data
    const [votingTrends, setVotingTrends] = useState([]);
    const [trendsLoading, setTrendsLoading] = useState(false);

    const fetchVotingTrends = async () => {
        setTrendsLoading(true);
        try {
            // Call your RPC that groups votes by time
            const { data: votesData, error } = await supabase
                .from('user_votes')
                .select('voted_at');

            if (!error && votesData) {
                const buckets = {};

                // Initialize all 24 hours with 0
                for (let hour = 0; hour < 24; hour++) {
                    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
                    buckets[hourLabel] = 0;
                }

                // Count votes into the right hour
                votesData.forEach(v => {
                    const date = new Date(v.voted_at);
                    const hourLabel = `${date.getHours().toString().padStart(2, '0')}:00`;
                    buckets[hourLabel] += 1;
                });

                // Convert to chart data
                const chartTrendsData = Object.entries(buckets).map(([hour, votes]) => ({
                    hour,
                    votes
                }));

                setVotingTrends(chartTrendsData);
            }
        } catch (error) {
            console.error('Error fetching voting trends:', error);
            // Fallback: generate trends based on total votes
            const trends = generateTrendsFromTotalVotes(stats.totalVotes);
            setVotingTrends(trends);
        } finally {
            setTrendsLoading(false);
        }
    };

    const estimateVotingPattern = async () => {
        // Get all votes to analyze pattern
        const { data: allVotes } = await supabase.rpc('get_vote_counts');

        if (!allVotes || allVotes.length === 0) {
            return generateTrendsFromTotalVotes(stats.totalVotes);
        }

        // Calculate total votes
        const totalVotes = allVotes.reduce((sum, vote) => sum + (vote.count || 0), 0);

        // Create time-based distribution
        const now = new Date();
        const hourlyDistribution = {};

        // Initialize distribution
        const hourLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
        hourLabels.forEach(label => {
            hourlyDistribution[label] = 0;
        });

        // Distribute votes based on update time
        allVotes.forEach((vote, index) => {
            const updateTime = new Date(vote.updated_at);
            const hour = updateTime.getHours();

            // Map to nearest display hour
            let displayHour;
            if (hour < 4) displayHour = '00:00';
            else if (hour < 8) displayHour = '04:00';
            else if (hour < 12) displayHour = '08:00';
            else if (hour < 16) displayHour = '12:00';
            else if (hour < 20) displayHour = '16:00';
            else if (hour < 24) displayHour = '20:00';
            else displayHour = '23:59';

            // Distribute proportionally based on position in array
            const proportion = (index + 1) / allVotes.length;
            hourlyDistribution[displayHour] += Math.round(vote.count * proportion);
        });

        // Make cumulative
        let cumulative = 0;
        const trends = hourLabels.map(label => {
            cumulative += hourlyDistribution[label];
            return {
                hour: label,
                votes: Math.min(Math.round(cumulative), totalVotes)
            };
        });

        return trends;
    };

    // Helper function to group votes by hour
    const groupVotesByHour = (votesData) => {
        const grouped = {};

        votesData.forEach(vote => {
            const date = new Date(vote.created_at);
            const hour = date.getHours();
            const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

            if (!grouped[hourLabel]) {
                grouped[hourLabel] = {
                    hour: hourLabel,
                    votes: 0
                };
            }
            grouped[hourLabel].votes += vote.count || 0;
        });

        // Fill in missing hours with 0 votes
        const result = [];
        for (let i = 0; i < 24; i++) {
            const hourLabel = `${i.toString().padStart(2, '0')}:00`;
            result.push(grouped[hourLabel] || { hour: hourLabel, votes: 0 });
        }

        return result;
    };

    // Generate realistic trending data based on total votes
    const generateRealisticTrends = (totalVotes) => {
        const trends = [];
        const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];

        let cumulativeVotes = 0;
        const peakHours = [10, 11, 12, 13, 14, 15, 16];
        const nightHours = [0, 1, 2, 3, 4, 5];

        for (let hour = 0; hour < 24; hour++) {
            const hourLabel = `${hour.toString().padStart(2, '0')}:00`;

            let hourVotes;
            if (peakHours.includes(hour)) {
                hourVotes = Math.floor(totalVotes * 0.15 / peakHours.length);
            } else if (nightHours.includes(hour)) {
                hourVotes = Math.floor(totalVotes * 0.05 / nightHours.length);
            } else {
                hourVotes = Math.floor(totalVotes * 0.1 / (24 - peakHours.length - nightHours.length));
            }

            cumulativeVotes += hourVotes;

            trends.push({
                hour: hourLabel,
                votes: cumulativeVotes
            });
        }

        return trends;
    };

    // Fallback sample data generator
    const generateSampleTrendsData = () => {
        const totalVotes = stats.totalVotes || 10000;

        return [
            { hour: '00:00', votes: Math.round(totalVotes * 0.05) },
            { hour: '04:00', votes: Math.round(totalVotes * 0.07) },
            { hour: '08:00', votes: Math.round(totalVotes * 0.15) },
            { hour: '12:00', votes: Math.round(totalVotes * 0.35) },
            { hour: '16:00', votes: Math.round(totalVotes * 0.65) },
            { hour: '20:00', votes: Math.round(totalVotes * 0.85) },
            { hour: '23:59', votes: totalVotes }
        ];
    };

    // Add this to your useEffect to fetch trends
    useEffect(() => {
        if (activeTab === 'analytics' || activeTab === 'dashboard') {
            fetchVotingTrends();
        }
    }, [activeTab, stats.totalVotes]);

    // Update the trends data usage
    const chartTrendsData = useMemo(() => {
        if (votingTrends.length > 0) {
            return votingTrends;
        }
        // Fallback to sample data if no real data
        return generateSampleTrendsData();
    }, [votingTrends]);

    // Custom tooltip for the trends chart
    const TrendTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
                    <p className="font-bold text-gray-900">{label}</p>
                    <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <span className="text-sm font-medium">Votes:</span>
                            <span className="text-sm font-bold">
                                {payload?.[0]?.value
                                    ? payload[0].value.toLocaleString()
                                    : '0'}
                            </span>
                        </div>
                        {payload[0].payload.previousHour && (
                            <div className="text-xs text-gray-500">
                                +{((payload[0].value - payload[0].payload.previousHour) / payload[0].payload.previousHour * 100).toFixed(1)}% from previous hour
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const setupRealtimeSubscription = () => {
        const subscription = supabase
            .channel('admin-dashboard')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'votes' },
                () => fetchData()
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

        return () => subscription.unsubscribe();
    };

    const handleAddAspirant = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('aspirants')
                .insert([{
                    name: formData.name,
                    party: formData.party,
                    seat: formData.seat,
                    county: formData.county,
                    constituency: formData.constituency,
                    ward: formData.ward
                }]);

            if (error) throw error;

            // Initialize vote count for new aspirant
            const { data: newAspirant } = await supabase
                .from('aspirants')
                .select('id')
                .eq('name', formData.name)
                .single();

            if (newAspirant) {
                await supabase
                    .from('votes')
                    .insert([{
                        aspirant_id: newAspirant.id,
                        count: 0
                    }]);
            }

            setShowAddModal(false);
            setFormData({
                name: '',
                party: '',
                seat: 'Presidential',
                county: '',
                constituency: '',
                ward: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error adding aspirant:', error);
            alert('Failed to add aspirant. Please try again.');
        }
    };

    const handleEditAspirant = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('aspirants')
                .update({
                    name: formData.name,
                    party: formData.party,
                    seat: formData.seat,
                    county: formData.county,
                    constituency: formData.constituency,
                    ward: formData.ward
                })
                .eq('id', editingAspirant.id);

            if (error) throw error;

            setShowEditModal(false);
            setEditingAspirant(null);
            setFormData({
                name: '',
                party: '',
                seat: 'Presidential',
                county: '',
                constituency: '',
                ward: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error editing aspirant:', error);
            alert('Failed to edit aspirant. Please try again.');
        }
    };

    const handleDeleteAspirant = async (id) => {
        if (!window.confirm('Are you sure you want to delete this aspirant? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('aspirants')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchData();
        } catch (error) {
            console.error('Error deleting aspirant:', error);
            alert('Failed to delete aspirant. Please try again.');
        }
    };

    const handleApproveRegistration = async (registrationId) => {
        try {
            const registration = registrations.find(r => r.id === registrationId);

            // Add to aspirants table
            const { error: aspirantError } = await supabase
                .from('aspirants')
                .insert([{
                    name: registration.full_name,
                    party: registration.party,
                    seat: registration.seat,
                    county: registration.county,
                    constituency: registration.constituency,
                    ward: registration.ward
                }]);

            if (aspirantError) throw aspirantError;

            // Update registration status
            const { error: updateError } = await supabase
                .from('aspirant_registrations')
                .update({ status: 'approved' })
                .eq('id', registrationId);

            if (updateError) throw updateError;

            // Initialize vote count
            const { data: newAspirant } = await supabase
                .from('aspirants')
                .select('id')
                .eq('name', registration.full_name)
                .single();

            if (newAspirant) {
                await supabase
                    .from('votes')
                    .insert([{
                        aspirant_id: newAspirant.id,
                        count: 0
                    }]);
            }

            fetchData();
            setShowRegistrationDetails(false);
        } catch (error) {
            console.error('Error approving registration:', error);
            alert('Failed to approve registration. Please try again.');
        }
    };

    const handleRejectRegistration = async (registrationId) => {
        try {
            const { error } = await supabase
                .from('aspirant_registrations')
                .update({ status: 'rejected' })
                .eq('id', registrationId);

            if (error) throw error;

            fetchData();
            setShowRegistrationDetails(false);
        } catch (error) {
            console.error('Error rejecting registration:', error);
            alert('Failed to reject registration. Please try again.');
        }
    };

    const handleResetVotes = async () => {
        if (!window.confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('votes')
                .update({ count: 0 });

            if (error) throw error;

            fetchData();
            alert('All votes have been reset to zero.');
        } catch (error) {
            console.error('Error resetting votes:', error);
            alert('Failed to reset votes. Please try again.');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    // Prepare chart data
    const getChartData = () => {
        const seatData = {};

        aspirants.forEach(aspirant => {
            // Lookup directly from votes object
            const voteCount = votes[aspirant.id] ?? 0;

            if (!seatData[aspirant.seat]) {
                seatData[aspirant.seat] = {
                    seat: aspirant.seat,
                    votes: 0,
                    aspirants: 0
                };
            }

            seatData[aspirant.seat].votes += voteCount;
            seatData[aspirant.seat].aspirants += 1;
        });

        return Object.values(seatData);
    };

    const getTopAspirants = () => {
        return aspirants
            .map(aspirant => ({
                ...aspirant,
                votes: votes[aspirant.id] ?? 0
            }))
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 5);
    };

    const getPartyDistribution = () => {
        const partyData = {};

        aspirants.forEach(aspirant => {
            const voteCount = votes[aspirant.id] ?? 0;

            if (!partyData[aspirant.party]) {
                partyData[aspirant.party] = {
                    party: aspirant.party,
                    votes: 0,
                    aspirants: 0
                };
            }

            partyData[aspirant.party].votes += voteCount;
            partyData[aspirant.party].aspirants += 1;
        });

        return Object.values(partyData)
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 5);
    };

    // Filter aspirants
    const filteredAspirants = aspirants.filter(aspirant => {
        const matchesSearch = searchTerm === '' ||
            aspirant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aspirant.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aspirant.county.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSeat = filterSeat === 'all' || aspirant.seat === filterSeat;

        return matchesSearch && matchesSeat;
    });

    const chartData = getChartData();
    const topAspirants = getTopAspirants();
    const partyDistribution = getPartyDistribution();

    const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex">
            {/* Left Navigation */}
            <div className="w-64 bg-white border-r border-gray-200 min-h-screen shadow-lg">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Kenya.svg"
                                alt="Kenya Logo"
                                className="h-12 w-12 rounded-full"
                            />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                            <p className="text-xs text-gray-500">Election Management</p>
                        </div>
                    </div>
                </div>

                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                                {item.id === 'registrations' && stats.pendingRegistrations > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {stats.pendingRegistrations}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-start border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="w-50 flex items-center justify-center gap-2 px-2 py-2.5 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <main className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 capitalize">
                                {activeTab === 'dashboard' ? 'Dashboard Overview' :
                                    activeTab === 'aspirants' ? 'Candidate Management' :
                                        activeTab === 'registrations' ? 'Candidate Registrations' :
                                            activeTab === 'voters' ? 'Voter Management' :
                                                activeTab === 'analytics' ? 'Analytics & Reports' :
                                                    'Settings'}
                            </h2>
                            <p className="text-gray-500 mt-1">
                                {activeTab === 'dashboard' ? 'Real-time election statistics and monitoring' :
                                    activeTab === 'aspirants' ? 'Manage registered candidates and their details' :
                                        activeTab === 'registrations' ? 'Review and approve candidate applications' :
                                            activeTab === 'voters' ? 'View registered voter information' :
                                                activeTab === 'analytics' ? 'Detailed election analytics and reports' :
                                                    'System configuration and settings'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/aspirant-registration')}
                                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                <UserPlus size={18} />
                                View Registration Portal
                            </button>
                            <button
                                onClick={() => navigate('/user')}
                                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                <UserCheck size={18} />
                                View Voting Portal
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">
                            {/* Statistics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium opacity-90">Total Votes</p>
                                            <p className="text-3xl font-bold mt-2">{stats.totalVotes.toLocaleString()}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Activity className="h-4 w-4" />
                                                <span className="text-xs opacity-80">Live Counting</span>
                                            </div>
                                        </div>
                                        <Vote className="h-10 w-10 opacity-80" />
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium opacity-90">Registered Voters</p>
                                            <p className="text-3xl font-bold mt-2">{stats.totalVoters.toLocaleString()}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Users className="h-4 w-4" />
                                                <span className="text-xs opacity-80">Total Voters</span>
                                            </div>
                                        </div>
                                        <Users className="h-10 w-10 opacity-80" />
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium opacity-90">Active Candidates</p>
                                            <p className="text-3xl font-bold mt-2">{stats.totalAspirants.toLocaleString()}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <UserCheck className="h-4 w-4" />
                                                <span className="text-xs opacity-80">Approved</span>
                                            </div>
                                        </div>
                                        <UserPlus className="h-10 w-10 opacity-80" />
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white shadow-xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium opacity-90">Pending Registrations</p>
                                            <p className="text-3xl font-bold mt-2">{stats.pendingRegistrations}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Clock className="h-4 w-4" />
                                                <span className="text-xs opacity-80">Awaiting Review</span>
                                            </div>
                                        </div>
                                        <FileText className="h-10 w-10 opacity-80" />
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Top Candidates Chart */}
                                <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Award className="h-5 w-5 text-yellow-500" />
                                        Top 5 Candidates by Votes
                                    </h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={topAspirants}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                                                <YAxis />
                                                <Tooltip formatter={(value) => [`${value} votes`, 'Count']} />
                                                <Bar dataKey="votes" radius={[8, 8, 0, 0]} fill="#3B82F6" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Party Distribution */}
                                <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-purple-600" />
                                        Party Vote Distribution
                                    </h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={partyDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={(entry) => `${entry.party}: ${entry.votes}`}
                                                    outerRadius={120}
                                                    fill="#8884d8"
                                                    dataKey="votes"
                                                >
                                                    {partyDistribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} votes`, 'Count']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-green-600" />
                                    Recent Activity
                                </h3>
                                <div className="space-y-4">
                                    {registrations.slice(0, 3).map(registration => (
                                        <div key={registration.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${registration.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                                    registration.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {registration.status === 'pending' ? <Clock size={20} /> :
                                                        registration.status === 'approved' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{registration.full_name}</p>
                                                    <p className="text-sm text-gray-500">{registration.seat} • {registration.party}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    registration.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                                                </span>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {new Date(registration.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Aspirants Management Tab */}
                    {activeTab === 'aspirants' && (
                        <div className="space-y-6">
                            {/* Action Bar */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search candidates..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <select
                                        value={filterSeat}
                                        onChange={(e) => setFilterSeat(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transition-all"
                                    >
                                        <PlusCircle size={18} />
                                        Add Candidate
                                    </button>
                                    <button
                                        onClick={handleResetVotes}
                                        className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:shadow-lg transition-all"
                                    >
                                        <RefreshCw size={18} />
                                        Reset Votes
                                    </button>
                                </div>
                            </div>

                            {/* Aspirants Table */}
                            <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
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

                                                return (
                                                    <tr key={aspirant.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
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
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-1">
                                                                <p className="text-lg font-bold text-gray-900">
                                                                    {(voteCount ?? 0).toLocaleString()}
                                                                </p>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                                                                        style={{ width: `${Math.min(100, (voteCount / Math.max(1, ...Object.values(votes))) * 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
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
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteAspirant(aspirant.id)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Delete"
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

                                {filteredAspirants.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 font-medium">No candidates found matching your criteria.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Registrations Tab */}
                    {activeTab === 'registrations' && (
                        <div className="space-y-6">
                            {/* Registration Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="rounded-2xl bg-yellow-50 border-2 border-yellow-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-yellow-800 uppercase">Pending</p>
                                            <p className="text-3xl font-black text-yellow-700 mt-2">{stats.pendingRegistrations}</p>
                                            <p className="text-sm text-yellow-600 mt-1">Awaiting Review</p>
                                        </div>
                                        <Clock className="h-12 w-12 text-yellow-500" />
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-green-50 border-2 border-green-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-green-800 uppercase">Approved</p>
                                            <p className="text-3xl font-black text-green-700 mt-2">{stats.approvedRegistrations}</p>
                                            <p className="text-sm text-green-600 mt-1">Active Candidates</p>
                                        </div>
                                        <CheckCircle className="h-12 w-12 text-green-500" />
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-red-800 uppercase">Rejected</p>
                                            <p className="text-3xl font-black text-red-700 mt-2">{stats.rejectedRegistrations}</p>
                                            <p className="text-sm text-red-600 mt-1">Declined Applications</p>
                                        </div>
                                        <XCircle className="h-12 w-12 text-red-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Registrations Table */}
                            <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Applicant</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Position</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Party</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Documents</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {registrations.map(registration => (
                                                <tr key={registration.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                                {registration.full_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{registration.full_name}</p>
                                                                <p className="text-sm text-gray-500">{registration.county}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-medium text-gray-900">{registration.seat}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                                            {registration.party}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            {registration.id_document && (
                                                                <a
                                                                    href={registration.id_document}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <FileText size={14} />
                                                                    ID Document
                                                                </a>
                                                            )}
                                                            {registration.party_certificate && (
                                                                <a
                                                                    href={registration.party_certificate}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <FileText size={14} />
                                                                    Party Certificate
                                                                </a>
                                                            )}
                                                            {registration.other_document && (
                                                                <a
                                                                    href={registration.other_document}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <FileText size={14} />
                                                                    Additional Document
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            registration.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-900">
                                                            {new Date(registration.created_at).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(registration.created_at).toLocaleTimeString()}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRegistration(registration);
                                                                    setShowRegistrationDetails(true);
                                                                }}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >
                                                                <FileText size={18} />
                                                            </button>
                                                            {registration.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApproveRegistration(registration.id)}
                                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                        title="Approve"
                                                                    >
                                                                        <Check size={18} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectRegistration(registration.id)}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Reject"
                                                                    >
                                                                        <X size={18} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {registrations.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 font-medium">No registration applications found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Voters Tab */}
                    {activeTab === 'voters' && (
                        <div className="space-y-6">
                            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Registered Voters ({profiles.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {profiles.map(profile => (
                                        <div key={profile.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                                                        {profile.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{profile.full_name}</p>
                                                        <p className="text-sm text-gray-500">ID: {profile.id_number}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={12} className="text-gray-400" />
                                                    <span>{profile.county}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Home size={12} className="text-gray-400" />
                                                    <span>{profile.constituency}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-2">
                                                    Registered: {new Date(profile.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Votes by Position */}
                                <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6">Votes by Position</h3>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="seat" />
                                                <YAxis />
                                                <Tooltip formatter={(value) => [`${value} votes`, 'Count']} />
                                                <Bar dataKey="votes" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Votes Trend */}
                                <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                <TrendingUp className="h-5 w-5 text-green-600" />
                                                Real-time Voting Trends (Last 24h)
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {trendsLoading ? 'Loading live data...' : 'Live voting activity'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                                Total: {stats.totalVotes.toLocaleString()}
                                            </span>
                                            <button
                                                onClick={fetchVotingTrends}
                                                disabled={trendsLoading}
                                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Refresh trends"
                                            >
                                                <RefreshCw className={`h-4 w-4 ${trendsLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-80">
                                        {trendsLoading ? (
                                            <div className="h-full flex items-center justify-center">
                                                <div className="text-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent mx-auto mb-2"></div>
                                                    <p className="text-sm text-gray-500">Loading voting trends...</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartTrendsData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                                    <XAxis
                                                        dataKey="hour"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                                        interval="preserveStartEnd"
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                                        tickFormatter={(value) => value.toLocaleString()}
                                                    />
                                                    <Tooltip content={<TrendTooltip />} />
                                                    <defs>
                                                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Line
                                                        type="monotone"
                                                        dataKey="votes"
                                                        stroke="#10B981"
                                                        strokeWidth={3}
                                                        dot={{ r: 4, fill: "#10B981" }}
                                                        activeDot={{
                                                            r: 6,
                                                            fill: "#10B981",
                                                            stroke: "#fff",
                                                            strokeWidth: 2
                                                        }}
                                                        fill="url(#trendGradient)"
                                                        animationDuration={1500}
                                                        animationBegin={0}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 font-medium">Peak Hour</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {chartTrendsData.length > 0
                                                    ? chartTrendsData.reduce((prev, current) =>
                                                        prev.votes > current.votes ? prev : current
                                                    ).hour
                                                    : 'N/A'
                                                }
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 font-medium">Hourly Avg</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {chartTrendsData.length > 0
                                                    ? Math.round(stats.totalVotes / 24).toLocaleString()
                                                    : '0'
                                                }
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 font-medium">Current Rate</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {chartTrendsData.length > 2
                                                    ? Math.round(
                                                        (chartTrendsData[chartTrendsData.length - 1].votes -
                                                            chartTrendsData[chartTrendsData.length - 2].votes) * 6
                                                    ).toLocaleString()
                                                    : '0'
                                                }
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                                            <p className="text-xs text-gray-500 font-medium">Live Status</p>
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <p className="text-lg font-bold text-green-600">Active</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Export Section */}
                            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Data Export</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all">
                                        <Download className="h-8 w-8 text-gray-600 mb-2" />
                                        <span className="font-bold text-gray-900">Export Votes</span>
                                        <span className="text-sm text-gray-500">CSV format</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all">
                                        <Download className="h-8 w-8 text-gray-600 mb-2" />
                                        <span className="font-bold text-gray-900">Export Candidates</span>
                                        <span className="text-sm text-gray-500">Excel format</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                                        <Download className="h-8 w-8 text-gray-600 mb-2" />
                                        <span className="font-bold text-gray-900">Export Voters</span>
                                        <span className="text-sm text-gray-500">PDF format</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">System Settings</h3>
                                <div className="space-y-4">
                                    <div className="p-4 border border-gray-200 rounded-xl">
                                        <h4 className="font-bold text-gray-900 mb-2">Voting Configuration</h4>
                                        <p className="text-sm text-gray-600 mb-3">Configure voting system parameters</p>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" className="rounded text-blue-600" defaultChecked />
                                                <span className="text-sm font-medium">Allow Multiple Votes per Position</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" className="rounded text-blue-600" />
                                                <span className="text-sm font-medium">Enable Vote Confirmation Emails</span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="checkbox" className="rounded text-blue-600" defaultChecked />
                                                <span className="text-sm font-medium">Show Live Vote Counts</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-4 border border-gray-200 rounded-xl">
                                        <h4 className="font-bold text-gray-900 mb-2">Registration Settings</h4>
                                        <p className="text-sm text-gray-600 mb-3">Configure aspirant registration requirements</p>
                                        <div className="space-y-3">
                                            <label className="block">
                                                <span className="text-sm font-medium text-gray-700">Required Documents</span>
                                                <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl">
                                                    <option>ID + Party Certificate</option>
                                                    <option>ID Only</option>
                                                    <option>All Documents Required</option>
                                                </select>
                                            </label>
                                            <label className="block">
                                                <span className="text-sm font-medium text-gray-700">Registration Deadline</span>
                                                <input type="date" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-xl" />
                                            </label>
                                        </div>
                                    </div>

                                    <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                                        Save Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Add Aspirant Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Add New Candidate</h3>
                        </div>
                        <form onSubmit={handleAddAspirant} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Political Party</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.party}
                                        onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Position</label>
                                    <select
                                        required
                                        value={formData.seat}
                                        onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {seats.map(seat => (
                                            <option key={seat} value={seat}>{seat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">County</label>
                                    <select
                                        required
                                        value={formData.county}
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ward (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                                >
                                    Add Candidate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Aspirant Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Edit Candidate</h3>
                        </div>
                        <form onSubmit={handleEditAspirant} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Political Party</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.party}
                                        onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Position</label>
                                    <select
                                        required
                                        value={formData.seat}
                                        onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {seats.map(seat => (
                                            <option key={seat} value={seat}>{seat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">County</label>
                                    <select
                                        required
                                        value={formData.county}
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ward (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                                >
                                    Update Candidate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Registration Details Modal */}
            {showRegistrationDetails && selectedRegistration && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-3xl">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Registration Application Details</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-4">Applicant Information</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Full Name</label>
                                            <p className="font-medium text-gray-900">{selectedRegistration.full_name}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Email</label>
                                            <p className="font-medium text-gray-900">{selectedRegistration.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Phone</label>
                                            <p className="font-medium text-gray-900">{selectedRegistration.phone}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-4">Political Information</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Position</label>
                                            <p className="font-medium text-gray-900">{selectedRegistration.seat}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Political Party</label>
                                            <p className="font-medium text-gray-900">{selectedRegistration.party}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">County</label>
                                            <p className="font-medium text-gray-900">{selectedRegistration.county}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-900 mb-4">Submitted Documents</h4>
                                <div className="space-y-3">
                                    {selectedRegistration.id_document && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <div>
                                                    <p className="font-medium text-gray-900">National ID Document</p>
                                                    <p className="text-sm text-gray-500">Verification document</p>
                                                </div>
                                            </div>
                                            <a
                                                href={selectedRegistration.id_document}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Document
                                            </a>
                                        </div>
                                    )}
                                    {selectedRegistration.party_certificate && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <p className="font-medium text-gray-900">Party Membership Certificate</p>
                                                    <p className="text-sm text-gray-500">Political party verification</p>
                                                </div>
                                            </div>
                                            <a
                                                href={selectedRegistration.party_certificate}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-600 hover:text-green-800 font-medium"
                                            >
                                                View Document
                                            </a>
                                        </div>
                                    )}
                                    {selectedRegistration.other_document && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-purple-600" />
                                                <div>
                                                    <p className="font-medium text-gray-900">Additional Document</p>
                                                    <p className="text-sm text-gray-500">Supporting documentation</p>
                                                </div>
                                            </div>
                                            <a
                                                href={selectedRegistration.other_document}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 hover:text-purple-800 font-medium"
                                            >
                                                View Document
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-900 mb-4">Application Status</h4>
                                <div className="flex items-center gap-4">
                                    <div className={`px-4 py-2 rounded-lg ${selectedRegistration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        selectedRegistration.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        <span className="font-bold">{selectedRegistration.status.charAt(0).toUpperCase() + selectedRegistration.status.slice(1)}</span>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Applied on {new Date(selectedRegistration.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {selectedRegistration.status === 'pending' && (
                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => handleRejectRegistration(selectedRegistration.id)}
                                        className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                                    >
                                        Reject Application
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApproveRegistration(selectedRegistration.id)}
                                        className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                                    >
                                        Approve & Add to Candidates
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowRegistrationDetails(false);
                                    setSelectedRegistration(null);
                                }}
                                className="w-full px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}