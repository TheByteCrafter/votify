import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
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

const API_URL = ' https://votifybackend-h0yt.onrender.com/api';

export default function AdminPortal() {
    const navigate = useNavigate();
    const [aspirants, setAspirants] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [votes, setVotes] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRegistrationDetails, setShowRegistrationDetails] = useState(false);


    const [stats, setStats] = useState({
        totalVotes: 0,
        totalVoters: 0,
        totalAspirants: 0,
        pendingRegistrations: 0,
        approvedRegistrations: 0,
        rejectedRegistrations: 0
    });


    const [formData, setFormData] = useState({
        name: '',
        party: '',
        seat: 'Presidential',
        county: '',
        constituency: '',
        ward: ''
    });

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



    const [votingTrends, setVotingTrends] = useState([]);
    const [trendsLoading, setTrendsLoading] = useState(false);

    const fetchVotingTrends = async () => {
        setTrendsLoading(true);
        try {

            const { data: votesData, error } = await supabase
                .from('user_votes')
                .select('voted_at');

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
            }
        } catch (error) {
            console.error('Error fetching voting trends:', error);

            const trends = generateTrendsFromTotalVotes(stats.totalVotes);
            setVotingTrends(trends);
        } finally {
            setTrendsLoading(false);
        }
    };


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

    useEffect(() => {
        if (activeTab === 'analytics' || activeTab === 'dashboard') {
            fetchVotingTrends();
        }
    }, [activeTab, stats.totalVotes]);


    const chartTrendsData = useMemo(() => {
        if (votingTrends.length > 0) {
            return votingTrends;
        }

        return generateSampleTrendsData();
    }, [votingTrends]);

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
                { event: '*', schema: 'public', table: 'user_votes' },
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


    const handleApproveRegistration = async (registrationId) => {
        try {
            const registration = registrations.find(r => r.id === registrationId);


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


            const { error: updateError } = await supabase
                .from('aspirant_registrations')
                .update({ status: 'approved' })
                .eq('id', registrationId);

            if (updateError) throw updateError;

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

            //send email to aspirantEmail about approval (not implemented yet)
            const result = await fetch(`${API_URL}/api/voters/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    email: registration.email,
                    subject: "Registration Approved",
                    message: "Your aspirant registration has been approved. You are now an official candidate in the election."
                })
            });

            if (!result.ok) {
                console.error('Failed to send approval email');
                alert('Registration approved and email notification failed.');
            }
            else {
                alert('Registration approved and email notification sent to the aspirant.');
            }


            fetchData();
            setShowRegistrationDetails(false);
        } catch (error) {
            console.error('Error approving registration:', error);
            alert('Failed to approve registration. Please try again.');
        }
    };

    const handleRejectRegistration = async (registrationId, aspirantEmail) => {
        try {

            const registration = registrations.find(r => r.id === registrationId);
            const { error } = await supabase
                .from('aspirant_registrations')
                .update({ status: 'rejected' })
                .eq('id', registrationId);

            if (error) throw error;


            const result = await fetch(`${API_URL}/api/voters/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    email: registration.email,
                    subject: "Registration Rejected",
                    message: "Your aspirant registration has been rejected."
                })
            });

            if (!result.ok) {
                console.error('Failed to send rejection email');
                alert('Registration rejected and email notification failed.');

            }
            else {
                alert('Registration rejected and email notification sent to the aspirant.');
            }
            fetchData();
            setShowRegistrationDetails(false);
        } catch (error) {
            console.error('Error rejecting registration:', error);
            alert('Failed to reject registration. Please try again.');
        }
    };



    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };


    const getChartData = () => {
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




    const chartData = getChartData();
    const topAspirants = getTopAspirants();
    const partyDistribution = getPartyDistribution();
    const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

    if (loading) {
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
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50/30 flex">
            <div className="w-64 bg-white border-r border-gray-200 min-h-screen shadow-lg">
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
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
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

            <div className="flex-1">
                <main className="p-8">

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
                                onClick={() => navigate('/aspirant')}
                                className="flex items-center gap-2 bg-linear-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                <UserPlus size={18} />
                                View Registration Portal
                            </button>
                            <button
                                onClick={() => navigate('/user')}
                                className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                            >
                                <UserCheck size={18} />
                                View Voting Portal
                            </button>
                        </div>
                    </div>


                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">

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

                    {activeTab === 'aspirants' && (
                        <AspirantPanel
                            aspirants={aspirants}
                            votes={votes}
                            registrations={registrations}
                            profiles={profiles}
                            onRefresh={fetchData}
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
                                                                        onClick={() => handleApproveRegistration(registration.id, registration.email)}
                                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                        title="Approve"
                                                                    >
                                                                        <Check size={18} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectRegistration(registration.id, registration.email)}
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


                    {activeTab === 'voters' && (
                        <VoterManagement />
                    )}
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
                    {activeTab === 'settings' && (
                        <AdminSettings />

                    )}
                </main>
            </div>

        </div>
    );
}