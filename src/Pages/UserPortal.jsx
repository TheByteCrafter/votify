import React, { useState, useEffect, useMemo } from 'react';
import {
    User,
    Vote,
    CheckCircle,
    AlertCircle,
    LogOut,
    ChevronRight,
    Users,
    Award,
    BarChart3,
    Shield,
    Home,
    MapPin,
    Fingerprint,
    TrendingUp,
    PieChart as PieChartIcon,
    Target,
    Trophy,
    Activity
} from 'lucide-react';
import { supabase } from '../../supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area } from 'recharts';

export default function UserPortal() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [aspirants, setAspirants] = useState([]);
    const [votes, setVotes] = useState({});
    const [userVotedSeats, setUserVotedSeats] = useState({});
    const [activeTab, setActiveTab] = useState('Presidential');
    const [votingStatus, setVotingStatus] = useState({ loading: false, message: '', type: '' });
    const [chartType, setChartType] = useState('bar');

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);


    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileData) setProfile(profileData);

            // Fetch Aspirants
            const { data: aspirantsData } = await supabase
                .from('aspirants')
                .select('*');

            if (aspirantsData) {
                setAspirants(aspirantsData);
                if (aspirantsData.length > 0) {
                    const uniqueSeats = [...new Set(aspirantsData.map(a => a.seat))];
                    if (!activeTab || !uniqueSeats.includes(activeTab)) {
                        setActiveTab(uniqueSeats[0]);
                    }
                }
            }
            // Fetch Global Vote Counts
            const { data: votesData } = await supabase.rpc('get_vote_counts');

            if (votesData) {
                const counts = {};
                votesData.forEach(v => {
                    counts[v.aspirant_id] = v.total;
                });
                setVotes(counts);
            }
            // Fetch User's Cast Votes
            const { data: castVotes, error } = await supabase
                .from('user_votes')
                .select('aspirant_id')
                .eq('user_id', user.id);

            if (error) {
                console.error(error);
            }

            if (castVotes && aspirantsData) {
                const map = {};
                castVotes.forEach(v => {
                    // Find the seat for this aspirant from the loaded aspirants list
                    const aspirant = aspirantsData.find(a => a.id === v.aspirant_id);
                    if (aspirant) {
                        map[aspirant.seat] = v.aspirant_id;
                    }
                });
                setUserVotedSeats(map);
            }
        };

        fetchData();

        // Set up Realtime subscription
        const votesSubscription = supabase
            .channel('public:user_votes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_votes' }, (payload) => {
                if (payload.new.user_id === user.id) return;

                setVotes(prev => ({
                    ...prev,
                    [payload.new.aspirant_id]: (prev[payload.new.aspirant_id] || 0) + 1
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(votesSubscription);
        };
    }, [user]);

    const handleVote = async (aspirant) => {
        if (userVotedSeats[aspirant.seat]) {
            setVotingStatus({
                loading: false,
                message: `You have already voted for the position of ${aspirant.seat}.`,
                type: 'error'
            });
            return;
        }

        setVotingStatus({ loading: true, message: 'Casting your vote...', type: 'info' });

        try {
            // Insert vote into user_votes ledger
            const { error: userVoteError } = await supabase
                .from('user_votes')
                .insert({
                    user_id: user.id,
                    aspirant_id: aspirant.id,
                    voted_at: new Date().toISOString()
                });

            if (userVoteError) throw userVoteError;

            // Optimistic update
            setVotes(prev => ({
                ...prev,
                [aspirant.id]: (prev[aspirant.id] || 0) + 1
            }));

            setUserVotedSeats(prev => ({ ...prev, [aspirant.seat]: aspirant.id }));
            setVotingStatus({
                loading: false,
                message: `Successfully voted for ${aspirant.name}!`,
                type: 'success'
            });
        } catch (err) {
            console.error(err);
            setVotingStatus({
                loading: false,
                message: 'Failed to cast vote. Please try again.',
                type: 'error'
            });
        }
    };

    const seats = useMemo(() => [...new Set(aspirants.map(a => a.seat))], [aspirants]);

    const filteredAspirants = useMemo(() => {
        if (!profile) return [];

        return aspirants.filter(a => {

            if (a.seat !== activeTab) return false;
            switch (a.seat) {
                case 'Presidential':
                    return true;
                case 'Governor':
                case 'Senator':
                case 'Women Rep':
                    return a.county === profile.county;
                case 'MP':
                    return a.constituency === profile.constituency;
                case 'MCA':
                    return a.ward === profile.ward;
                default:
                    return true;
            }
        });
    }, [aspirants, activeTab, profile]);

    const chartData = useMemo(() => {
        return filteredAspirants.map(aspirant => {
            const voteCount = votes[aspirant.id] || 0;
            const party = aspirant.party;

            let color;
            if (party.includes('Party')) color = '#3B82F6';
            else if (party.includes('Movement')) color = '#10B981';
            else if (party.includes('Alliance')) color = '#8B5CF6';
            else if (party.includes('Union')) color = '#F59E0B';
            else if (party.includes('Coalition')) color = '#EF4444';
            else color = '#6B7280';

            return {
                name: aspirant.name,
                shortName: aspirant.name.split(' ')[0],
                votes: voteCount,
                party: party,
                color: color,
                percentage: 0,
                isUserVote: userVotedSeats[aspirant.seat] === aspirant.id
            };
        })
            .sort((a, b) => b.votes - a.votes)
            .map((item, index, array) => {
                const totalVotes = array.reduce((sum, curr) => sum + curr.votes, 0);
                return {
                    ...item,
                    percentage: totalVotes > 0 ? Math.round((item.votes / totalVotes) * 100) : 0,
                    rank: index + 1
                };
            });
    }, [filteredAspirants, votes, userVotedSeats]);

    // Prepare trend data
    const trendData = useMemo(() => {
        return chartData.map(item => ({
            name: item.shortName,
            trend: Array.from({ length: 5 }, (_, i) => ({
                hour: `${i + 1}h`,
                votes: Math.max(0, item.votes - Math.random() * 100)
            }))
        }));
    }, [chartData]);

    // Prepare radar chart data
    const radarData = useMemo(() => {
        const maxVotes = Math.max(...chartData.map(d => d.votes), 1);
        return chartData.map(item => ({
            subject: item.shortName,
            votes: item.votes,
            percentage: item.percentage,
            fullMark: maxVotes
        }));
    }, [chartData]);

    const totalVotesCast = useMemo(() => {
        return Object.values(votes).reduce((sum, count) => sum + count, 0);
    }, [votes]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Custom tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
                    <p className="font-bold text-gray-900">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 mt-1">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm font-medium">{entry.dataKey === 'votes' ? 'Votes' : 'Percentage'}:</span>
                            <span className="text-sm font-bold">{entry.value}{entry.dataKey === 'percentage' ? '%' : ''}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-linear-to-br from-blue-50 to-indigo-50">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                        <Vote className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-blue-600 animate-pulse" />
                    </div>
                    <p className="text-gray-600 font-medium mt-4 animate-pulse">Securing your voting session...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-50 p-6 text-center">
                <div className="mb-6 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 p-5 shadow-lg animate-bounce">
                    <Shield className="h-16 w-16 text-white" />
                </div>
                <h1 className="mb-2 text-3xl font-bold text-gray-900">Secure Access Required</h1>
                <p className="mb-8 max-w-md text-gray-600 text-lg">
                    Please authenticate with your credentials to access the national voting system.
                </p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-10 py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
                >
                    Proceed to Authentication
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50/20 to-indigo-50/20 pb-12">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200/50 px-4 py-4 shadow-lg shadow-gray-200/20 sm:px-8">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl animate-pulse-slow">
                                <Fingerprint size={28} />
                            </div>
                            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-ping"></div>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">National Digital Voting</h1>
                            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Secure & Transparent Elections</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-blue-600" />
                                <p className="text-sm font-bold text-gray-900">{profile?.full_name || 'Verified Voter'}</p>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin size={12} />
                                {profile?.constituency || 'National Voter'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'bar' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Bar
                                </button>
                                <button
                                    onClick={() => setChartType('area')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'area' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Area
                                </button>
                                <button
                                    onClick={() => setChartType('radar')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${chartType === 'radar' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Radar
                                </button>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all hover:shadow"
                            >
                                <LogOut size={16} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl p-4 sm:p-8">
                {/* Alerts */}
                {votingStatus.message && (
                    <div className={`mb-6 rounded-2xl p-5 shadow-xl animate-in fade-in slide-in-from-top-2 ${votingStatus.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500' :
                        votingStatus.type === 'success' ? 'bg-linear-to-r from-green-50 to-emerald-100 border-l-4 border-green-500' :
                            'bg-linear-to-r from-blue-50 to-cyan-100 border-l-4 border-blue-500'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${votingStatus.type === 'error' ? 'bg-red-100' : votingStatus.type === 'success' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                {votingStatus.type === 'error' ?
                                    <AlertCircle className="h-5 w-5 text-red-600" /> :
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                }
                            </div>
                            <p className="text-sm font-bold flex-1">{votingStatus.message}</p>
                            <button
                                onClick={() => setVotingStatus({ ...votingStatus, message: '' })}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold hover:scale-110 transition-transform"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                {/* Election Overview */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-2xl transform transition-all hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Total Votes</p>
                                    <p className="text-4xl font-black mt-2 tracking-tight">{totalVotesCast.toLocaleString()}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Activity className="h-4 w-4" />
                                        <span className="text-xs opacity-80">Live Counting</span>
                                    </div>
                                </div>
                                <Vote className="h-12 w-12 opacity-80" />
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-2xl transform transition-all hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Your Progress</p>
                                    <p className="text-4xl font-black mt-2 tracking-tight">{Object.keys(userVotedSeats).length}<span className="text-xl">/{seats.length}</span></p>
                                    <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                                        <div
                                            className="bg-white h-2 rounded-full transition-all duration-1000"
                                            style={{ width: `${(Object.keys(userVotedSeats).length / seats.length) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <CheckCircle className="h-12 w-12 opacity-80" />
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 text-white shadow-2xl transform transition-all hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Active Position</p>
                                    <p className="text-2xl font-black mt-2 tracking-tight">{activeTab}</p>
                                    <p className="text-xs opacity-80 mt-1">{filteredAspirants.length} Candidates</p>
                                </div>
                                <Target className="h-12 w-12 opacity-80" />
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-2xl transform transition-all hover:scale-[1.02]">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium opacity-90">Leading</p>
                                    {chartData[0] ? (
                                        <>
                                            <p className="text-xl font-black mt-2 truncate">{chartData[0].shortName}</p>
                                            <p className="text-xs opacity-80 mt-1">{chartData[0].votes} votes ({chartData[0].percentage}%)</p>
                                        </>
                                    ) : (
                                        <p className="text-2xl font-black mt-2">--</p>
                                    )}
                                </div>
                                <Trophy className="h-12 w-12 opacity-80" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Charts Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <BarChart3 className="h-7 w-7 text-blue-600" />
                            Live Results Dashboard - {activeTab}
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 font-medium">Chart Type:</span>
                            <div className="flex items-center gap-1">
                                {['bar', 'area', 'radar'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setChartType(type)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${chartType === type
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 rounded-2xl bg-white p-6 border border-gray-200 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">Vote Distribution</h4>
                                    <p className="text-sm text-gray-500">Real-time voting results</p>
                                </div>
                                <TrendingUp className="h-5 w-5 text-green-500 animate-pulse" />
                            </div>

                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartType === 'bar' ? (
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                            <XAxis
                                                dataKey="shortName"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                                label={{ value: 'Votes', angle: -90, position: 'insideLeft', offset: 10 }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar
                                                dataKey="votes"
                                                name="Total Votes"
                                                radius={[8, 8, 0, 0]}
                                                animationDuration={1500}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.color}
                                                        stroke={entry.isUserVote ? "#000" : "none"}
                                                        strokeWidth={entry.isUserVote ? 2 : 0}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    ) : chartType === 'area' ? (
                                        <AreaChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                            <XAxis dataKey="shortName" />
                                            <YAxis />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="votes"
                                                stroke="#3B82F6"
                                                fill="url(#colorVotes)"
                                                strokeWidth={3}
                                                animationDuration={1500}
                                            />
                                            <defs>
                                                <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                        </AreaChart>
                                    ) : (
                                        <RadarChart data={radarData}>
                                            <PolarGrid stroke="#e5e7eb" />
                                            <PolarAngleAxis dataKey="subject" />
                                            <PolarRadiusAxis />
                                            <Radar
                                                name="Votes"
                                                dataKey="votes"
                                                stroke="#3B82F6"
                                                fill="#3B82F6"
                                                fillOpacity={0.6}
                                                animationDuration={1500}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                        </RadarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>


                        <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-2xl">
                            <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <PieChartIcon className="h-5 w-5 text-purple-600" />
                                Party Breakdown
                            </h4>

                            <div className="h-64 mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.shortName}: ${entry.percentage}%`}
                                            outerRadius={80}
                                            innerRadius={40}
                                            paddingAngle={5}
                                            dataKey="percentage"
                                            animationDuration={1500}
                                            animationBegin={0}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    stroke="#fff"
                                                    strokeWidth={2}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [`${value}%`, 'Share']}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid #e5e7eb',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>


                            <div className="space-y-2">
                                {chartData.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">{item.party}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-gray-900">{item.votes.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">{item.percentage}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Select Position to Vote</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {seats.map(seat => (
                            <button
                                key={seat}
                                onClick={() => setActiveTab(seat)}
                                className={`relative p-4 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] ${activeTab === seat
                                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-2xl ring-2 ring-blue-500 ring-offset-2'
                                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 shadow-lg hover:shadow-xl'
                                    }`}
                            >
                                <div className="font-bold mb-1">{seat}</div>
                                <div className="text-xs opacity-80">
                                    {aspirants.filter(a => a.seat === seat).length} candidates
                                </div>
                                {userVotedSeats[seat] && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle className={`h-5 w-5 ${activeTab === seat ? 'text-white' : 'text-green-500'}`} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAspirants.length > 0 ? (
                        filteredAspirants.map(aspirant => {
                            const isVotedByMe = userVotedSeats[aspirant.seat] === aspirant.id;
                            const hasVotedForThisSeat = !!userVotedSeats[aspirant.seat];
                            const voteCount = votes[aspirant.id] || 0;
                            const percentage = chartData.find(d => d.name === aspirant.name)?.percentage || 0;

                            return (
                                <div
                                    key={aspirant.id}
                                    className={`group relative flex flex-col rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl ${isVotedByMe
                                        ? 'border-green-500 bg-linear-to-br from-green-50 to-emerald-50 shadow-xl'
                                        : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-xl'
                                        }`}
                                >
                                    {chartData.findIndex(d => d.name === aspirant.name) < 3 && (
                                        <div className="absolute -top-3 -left-3 z-10">
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-black text-lg shadow-2xl ${chartData.findIndex(d => d.name === aspirant.name) === 0 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                                                chartData.findIndex(d => d.name === aspirant.name) === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                                    'bg-gradient-to-r from-amber-700 to-orange-600'
                                                }`}>
                                                {chartData.findIndex(d => d.name === aspirant.name) + 1}
                                            </div>
                                        </div>
                                    )}


                                    {isVotedByMe && (
                                        <div className="absolute -top-4 -right-4 z-10">
                                            <div className="rounded-full bg-linear-to-r from-green-500 to-emerald-600 p-3 text-white shadow-2xl animate-bounce">
                                                <CheckCircle size={24} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6">
                                        <div className="mb-6 flex items-center gap-4">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-3xl font-black text-blue-600 border-4 border-white shadow-xl">

                                                <img src={aspirant.profile_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(aspirant.full_name) + '&background=blue&color=fff&size=128'} alt={aspirant.full_name} className="h-10 w-10 rounded-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700">{aspirant.name}</h3>
                                                <div className="inline-block rounded-full bg-linear-to-r from-blue-100 to-blue-50 px-4 py-1.5 mt-2">
                                                    <p className="text-sm font-black text-blue-700">{aspirant.party}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <MapPin size={14} />
                                                    <span>County</span>
                                                </div>
                                                <span className="font-bold text-gray-900">{aspirant.county}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Home size={14} />
                                                    <span>Constituency</span>
                                                </div>
                                                <span className="font-bold text-gray-900">{aspirant.constituency || 'County-wide'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto border-t border-gray-100 p-6">
                                        <button
                                            onClick={() => handleVote(aspirant)}
                                            disabled={hasVotedForThisSeat || votingStatus.loading}
                                            className={`w-full flex items-center justify-center gap-3 rounded-xl py-4 text-base font-black transition-all duration-300 ${isVotedByMe
                                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl cursor-default'
                                                : hasVotedForThisSeat
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-300'
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-2xl hover:scale-[1.02] active:scale-95 shadow-xl'
                                                }`}
                                        >
                                            {isVotedByMe ? (
                                                <>
                                                    <CheckCircle size={20} />
                                                    Your Choice
                                                </>
                                            ) : hasVotedForThisSeat ? (
                                                'Already Voted'
                                            ) : votingStatus.loading ? (
                                                <>
                                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    Cast Vote
                                                    <ChevronRight size={20} />
                                                </>
                                            )}
                                        </button>

                                        {/* Progress Bar */}
                                        <div className="mt-6 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vote Count</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black text-gray-900">{voteCount.toLocaleString()}</span>
                                                    <span className="text-sm font-bold text-blue-600">({percentage}%)</span>
                                                </div>
                                            </div>
                                            <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${isVotedByMe ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>0</span>
                                                <span>Total</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-20 text-center bg-gradient-to-br from-white to-blue-50 rounded-2xl border-2 border-dashed border-gray-400">
                            <div className="mb-4 inline-block rounded-full bg-gray-200 p-5">
                                <User className="h-16 w-16 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-700 mb-2">No Candidates Registered</h3>
                            <p className="text-gray-500 font-medium">There are no aspirants registered for the {activeTab} position.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-16 border-t border-gray-200/50 bg-white/80 py-8 px-4 text-center backdrop-blur-sm">
                <div className="mx-auto max-w-4xl">
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className={`h-8 w-8 rounded-full ${i === 1 ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-300'} flex items-center justify-center text-white font-bold`}>
                                        {i + 1}
                                    </div>
                                    <span className="text-xs text-gray-500 mt-1">Step {i + 1}</span>
                                </div>
                            ))}
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 text-gray-800 font-black text-lg">
                                <Shield className="h-5 w-5" />
                                Secure Digital Voting System
                            </div>
                            <p className="text-sm text-gray-600 max-w-2xl mt-2">
                                Ensuring transparency, security, and integrity in the democratic process through advanced encryption and real-time verification.
                            </p>
                            <p className="text-xs text-gray-400 mt-6 tracking-widest uppercase">
                                © 2026 Independent Electoral Commission • All Votes Secured
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}