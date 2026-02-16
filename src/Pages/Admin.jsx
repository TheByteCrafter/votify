import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import emailjs from '@emailjs/browser';
import {
    Users,
    Vote,
    BarChart3,
    LogOut,
    Download,
    RefreshCw,
    UserPlus,
    Award,
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
import VoterManagement from '../Components/VoterManagement';
import AdminSettings from '../Components/AdminSettings';
import AspirantPanel from '../Components/AspirantsPanel';

const API_URL = 'https://votifybackend-h0yt.onrender.com/api';


const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export default function AdminPortal() {
    const navigate = useNavigate();
    const [aspirants, setAspirants] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [votes, setVotes] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showRegistrationDetails, setShowRegistrationDetails] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(Date.now());

    // Rejection dialog state
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedForRejection, setSelectedForRejection] = useState(null);

    const [stats, setStats] = useState({
        totalVotes: 0,
        totalVoters: 0,
        totalAspirants: 0,
        pendingRegistrations: 0,
        approvedRegistrations: 0,
        rejectedRegistrations: 0
    });

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'aspirants', label: 'Candidates', icon: UserCog },
        { id: 'registrations', label: 'Registrations', icon: FileCheck },
        { id: 'voters', label: 'Voters', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings }
    ];

    // Initialize EmailJS
    useEffect(() => {
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
        if (publicKey) {
            emailjs.init(publicKey);
            console.log('✅ EmailJS initialized');
        } else {
            console.error('❌ EmailJS public key not found');
        }
    }, []);

    // Optimized fetch function with minimum interval
    const fetchData = useCallback(async (force = false) => {
        const now = Date.now();
        // Don't fetch if last fetch was less than 10 seconds ago (unless forced)
        if (!force && now - lastFetchTime < 10000) {
            return;
        }

        setLoading(true);
        try {
            const { data: aspirantsData } = await supabase
                .from('aspirants')
                .select('*')
                .order('created_at', { ascending: false });

            if (aspirantsData) setAspirants(aspirantsData);

            const { data: registrationsData } = await supabase
                .from('aspirant_registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (registrationsData) setRegistrations(registrationsData);

            const { data: votesData } = await supabase
                .from('user_votes')
                .select('aspirant_id');

            if (votesData) {
                const counts = {};
                votesData.forEach(v => {
                    counts[v.aspirant_id] = (counts[v.aspirant_id] || 0) + 1;
                });
                setVotes(counts);
            }

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profilesData) setProfiles(profilesData);

            const totalVotes = (votesData || []).length;
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
            
            setLastFetchTime(now);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, [lastFetchTime]);

    // Debounced version of fetchData for realtime updates
    /*const debouncedFetchData = useCallback(
        debounce(() => {
            fetchData(true);
        }, 5000), // Wait 5 seconds after last call before fetching
        [fetchData]
    );*/

    // Optimized realtime subscription
    useEffect(() => {
        const subscription = supabase
            .channel('admin-dashboard')
            // Only listen to INSERT on votes (most frequent)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'user_votes' },
                (payload) => {
                    // Just update vote count locally instead of full fetch
                    setVotes(prev => {
                        const newVotes = { ...prev };
                        const aspirantId = payload.new.aspirant_id;
                        newVotes[aspirantId] = (newVotes[aspirantId] || 0) + 1;
                        return newVotes;
                    });
                    
                    // Update total votes stat
                    setStats(prev => ({
                        ...prev,
                        totalVotes: prev.totalVotes + 1
                    }));
                }
            )
            // Only listen to status changes on registrations (important)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'aspirant_registrations' },
                (payload) => {
                    // Only fetch if status changed
                    if (payload.old.status !== payload.new.status) {
                        debouncedFetchData();
                    }
                }
            )
            .subscribe();

        return () => {
            debouncedFetchData.cancel?.();
            subscription.unsubscribe();
        };
    }, [debouncedFetchData]);

    // Initial data fetch
    useEffect(() => {
        fetchData(true);
    }, []); // Empty dependency array - only runs once on mount

    const [votingTrends, setVotingTrends] = useState([]);
    const [trendsLoading, setTrendsLoading] = useState(false);
    const [lastTrendsFetch, setLastTrendsFetch] = useState(Date.now());

    // Optimized voting trends fetch
    const fetchVotingTrends = useCallback(async () => {
        // Only fetch if on analytics tab
        if (activeTab !== 'analytics' && activeTab !== 'dashboard') return;
        
        // Don't fetch if last fetch was less than 30 seconds ago
        const now = Date.now();
        if (now - lastTrendsFetch < 30000) return;

        setTrendsLoading(true);
        try {
            const { data: votesData, error } = await supabase
                .from('user_votes')
                .select('voted_at')
                .gte('voted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Only last 24 hours

            if (!error && votesData) {
                const buckets = {};
                for (let hour = 0; hour < 24; hour++) {
                    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
                    buckets[hourLabel] = 0;
                }

                votesData.forEach(v => {
                    const date = new Date(v.voted_at);
                    const hourLabel = `${date.getHours().toString().padStart(2, '0')}:00`;
                    buckets[hourLabel] += 1;
                });

                const chartTrendsData = Object.entries(buckets).map(([hour, votes]) => ({
                    hour,
                    votes
                }));

                setVotingTrends(chartTrendsData);
                setLastTrendsFetch(now);
            }
        } catch (error) {
            console.error('Error fetching voting trends:', error);
        } finally {
            setTrendsLoading(false);
        }
    }, [activeTab, lastTrendsFetch]);

    // Debounced trends fetch
    const debouncedFetchTrends = useCallback(
        debounce(() => {
            fetchVotingTrends();
        }, 2000),
        [fetchVotingTrends]
    );

    // Only fetch trends when tab changes
    useEffect(() => {
        if (activeTab === 'analytics' || activeTab === 'dashboard') {
            debouncedFetchTrends();
        }
        return () => debouncedFetchTrends.cancel?.();
    }, [activeTab, debouncedFetchTrends]);

    // Memoize all derived data to prevent unnecessary recalculations
    const chartData = useMemo(() => {
        const seatData = {};
        aspirants.forEach(aspirant => {
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
    }, [aspirants, votes]);

    const topAspirants = useMemo(() => {
        return aspirants
            .map(aspirant => ({
                ...aspirant,
                votes: votes[aspirant.id] ?? 0
            }))
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 5);
    }, [aspirants, votes]);

    const partyDistribution = useMemo(() => {
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
    }, [aspirants, votes]);

    const chartTrendsData = useMemo(() => {
        if (votingTrends.length > 0) {
            return votingTrends;
        }
        // Generate sample data only once
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
    }, [votingTrends, stats.totalVotes]);

    const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

    // Handle approve registration
    const handleApproveRegistration = async (registrationId) => {
        setIsProcessing(true);

        try {
            const registration = registrations.find(r => r.id === registrationId);

            if (!registration) {
                throw new Error('Registration not found');
            }

            // 1. Insert into aspirants table
            const { error: aspirantError } = await supabase
                .from('aspirants')
                .insert([{
                    name: registration.full_name,
                    party: registration.party,
                    seat: registration.seat,
                    email: registration.email,
                    phone: registration.phone,
                    county: registration.county,
                    constituency: registration.constituency,
                    ward: registration.ward
                }]);

            if (aspirantError) throw aspirantError;

            // 2. Update registration status
            const { error: updateError } = await supabase
                .from('aspirant_registrations')
                .update({ status: 'approved' })
                .eq('id', registrationId);

            if (updateError) throw updateError;

            // 3. Get the new aspirant ID and create votes entry
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

            // 4. Send approval email
            try {
                const templateParams = {
                    name: registration.full_name,
                    party: registration.party,
                    seat: registration.seat,
                    county: registration.county || 'Not specified',
                    constituency: registration.constituency || 'Not specified',
                    ward: registration.ward || 'Not specified',
                    email: registration.email,
                    approval_date: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    support_phone: '+254 712 345 678',
                    current_year: new Date().getFullYear().toString()
                };

                await emailjs.send(
                    import.meta.env.VITE_EMAILJS_SERVICE_ID,
                    import.meta.env.VITE_EMAILJS_TEMPLATE_ID_APPROVAL,
                    templateParams
                );

                alert(`✅ ${registration.full_name} approved successfully! Confirmation email sent.`);
            } catch (emailError) {
                console.error('❌ Email error:', emailError);
                alert(`⚠️ ${registration.full_name} approved but email failed.`);
            }

            // Force refresh data
            await fetchData(true);
            setShowRegistrationDetails(false);

        } catch (error) {
            console.error('❌ Error:', error);
            alert(`Failed to approve registration: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle reject registration
    const handleRejectRegistration = async (registration, reason, additionalMessage) => {
        setIsProcessing(true);

        try {
            const { error } = await supabase
                .from('aspirant_registrations')
                .update({ status: 'rejected' })
                .eq('id', registration.id);

            if (error) throw error;

            // Send rejection email
            try {
                const templateParams = {
                    name: registration.full_name,
                    party: registration.party,
                    seat: registration.seat,
                    email: registration.email,
                    rejection_reason: reason,
                    next_steps: additionalMessage || 'You may reapply in the next election cycle',
                    review_date: new Date().toLocaleDateString()
                };

                await emailjs.send(
                    import.meta.env.VITE_EMAILJS_SERVICE_ID,
                    import.meta.env.VITE_EMAILJS_TEMPLATE_ID_REJECTION,
                    templateParams
                );

                alert(`✅ ${registration.full_name} rejected. Notification email sent.`);
            } catch (emailError) {
                console.error('❌ Email error:', emailError);
                alert(`⚠️ ${registration.full_name} rejected but email failed.`);
            }

            await fetchData(true);
            setShowRejectDialog(false);
            setSelectedForRejection(null);

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to reject registration.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    // Rejection Dialog Component
    const RejectionDialog = ({ registration, onClose, onConfirm }) => {
        const [reason, setReason] = useState('');
        const [additionalMsg, setAdditionalMsg] = useState('');

        const rejectionReasons = [
            'Incomplete documentation',
            'Does not meet age requirement',
            'Invalid nomination papers',
            'Criminal record',
            'Party not registered',
            'Missing signatures',
            'Duplicate application',
            'Other'
        ];

        const handleSubmit = (e) => {
            e.preventDefault();
            onConfirm(registration, reason, additionalMsg);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-bold mb-4">Reject Registration</h3>
                    <p className="mb-4 text-sm text-gray-600">
                        Rejecting: <span className="font-semibold">{registration.full_name}</span>
                    </p>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                                Reason for Rejection *
                            </label>
                            <select
                                className="w-full p-2 border rounded"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            >
                                <option value="">Select a reason...</option>
                                {rejectionReasons.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                                Additional Message (Optional)
                            </label>
                            <textarea
                                className="w-full p-2 border rounded"
                                rows="3"
                                value={additionalMsg}
                                onChange={(e) => setAdditionalMsg(e.target.value)}
                                placeholder="Add any specific details or next steps..."
                            />
                        </div>

                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                disabled={!reason || isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const TrendTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
                    <p className="font-bold text-gray-900">{label}</p>
                    <p className="text-sm font-bold text-green-600">
                        {payload[0].value.toLocaleString()} votes
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading && aspirants.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-linear-to-br from-blue-50 to-indigo-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden bg-linear-to-br from-gray-50 to-blue-50/30">
        
            <div className="w-64 bg-white border-r border-gray-200 shadow-lg shrink-0 fixed h-screen overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-red-600 to-orange-600 text-white shadow-lg">
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
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    activeTab === item.id
                                        ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
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
            </div>

            <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
                <div className="bg-white border-b border-gray-200 px-8 py-4 shrink-0 fixed top-0 right-0 left-64 z-10">
                    <div className="flex justify-between items-center">
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
                                onClick={() => navigate('/aspirant')}
                                className="flex items-center gap-2 bg-linear-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                <UserPlus size={18} />
                                <span className="hidden md:inline">Registration Portal</span>
                            </button>
                            <button
                                onClick={() => navigate('/user')}
                                className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                <UserCheck size={18} />
                                <span className="hidden md:inline">Voting Portal</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl"
                                title="Logout"
                            >
                                <LogOut size={18} />
                                <span className="hidden md:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content - with padding for fixed header */}
                <main className="flex-1 overflow-y-auto mt-24 p-8">
                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="rounded-2xl bg-linear-to-r from-blue-500 to-blue-600 p-6 text-white shadow-xl">
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

                                <div className="rounded-2xl bg-linear-to-r from-green-500 to-emerald-600 p-6 text-white shadow-xl">
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

                                <div className="rounded-2xl bg-linear-to-r from-purple-500 to-pink-600 p-6 text-white shadow-xl">
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

                                <div className="rounded-2xl bg-linear-to-r from-orange-500 to-amber-600 p-6 text-white shadow-xl">
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

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                    registration.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                                    registration.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                    {registration.status === 'pending' ? <Clock size={20} /> :
                                                        registration.status === 'approved' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{registration.full_name}</p>
                                                    <p className="text-sm text-gray-500">{registration.seat} • {registration.party}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                    registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    registration.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
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

                    {activeTab === 'aspirants' && (
                        <AspirantPanel
                            aspirants={aspirants}
                            votes={votes}
                            registrations={registrations}
                            profiles={profiles}
                            onRefresh={() => fetchData(true)}
                            loading={loading}
                        />
                    )}

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
                                        <thead className="bg-linear-to-r from-gray-50 to-gray-100">
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
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                            registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            registration.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {registration.status.charAt(0).toUpperCase() + registration.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-900">
                                                            {new Date(registration.created_at).toLocaleDateString()}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            {registration.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApproveRegistration(registration.id)}
                                                                        disabled={isProcessing}
                                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                                                        title="Approve"
                                                                    >
                                                                        <Check size={18} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedForRejection(registration);
                                                                            setShowRejectDialog(true);
                                                                        }}
                                                                        disabled={isProcessing}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                            </div>
                        </div>
                    )}

                    {activeTab === 'voters' && <VoterManagement />}

                    {activeTab === 'analytics' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                                <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-gray-900">Voting Trends (24h)</h3>
                                        <button
                                            onClick={() => fetchVotingTrends()}
                                            disabled={trendsLoading}
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${trendsLoading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={chartTrendsData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="hour" />
                                                <YAxis />
                                                <Tooltip content={<TrendTooltip />} />
                                                <Line type="monotone" dataKey="votes" stroke="#10B981" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Data Export</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <button className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all">
                                        <Download className="h-8 w-8 text-gray-600 mb-2" />
                                        <span className="font-bold text-gray-900">Export Votes</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all">
                                        <Download className="h-8 w-8 text-gray-600 mb-2" />
                                        <span className="font-bold text-gray-900">Export Candidates</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all">
                                        <Download className="h-8 w-8 text-gray-600 mb-2" />
                                        <span className="font-bold text-gray-900">Export Voters</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && <AdminSettings />}
                </main>
            </div>

            {/* Rejection Dialog */}
            {showRejectDialog && selectedForRejection && (
                <RejectionDialog
                    registration={selectedForRejection}
                    onClose={() => {
                        setShowRejectDialog(false);
                        setSelectedForRejection(null);
                    }}
                    onConfirm={handleRejectRegistration}
                />
            )}
        </div>
    );
}