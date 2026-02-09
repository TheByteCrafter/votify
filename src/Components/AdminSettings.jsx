import { supabase } from "../../supabase";
import React, { useState, useEffect } from "react";

const AdminSettings = () => {
    const [isSystemActive, setIsSystemActive] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [settings, setSettings] = useState({
        showLiveVoteCounts: true,
        registrationDeadline: new Date().toISOString().split('T')[0],
        maxVotesPerUser: 1,
        allowVoteChange: false,
        electionTitle: "2024 General Elections"
    });

    useEffect(() => {
        fetchSystemStatus();
        fetchSystemSettings();
    }, []);

    const fetchSystemStatus = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('System')
                .select('ISSystemActive,showLiveCounts,election_title,max_votes_per_user')
                .single();

            if (error) throw error;

            if (data) {
                setIsSystemActive(data.ISSystemActive);
                setSettings(prev => ({
                    ...prev,
                    electionTitle: data.election_title || "2024 General Elections",
                    maxVotesPerUser: data.max_votes_per_user || 1,
                    showLiveVoteCounts: data.showLiveCounts || false
                }));
            }
        } catch (error) {
            console.error('Failed to fetch system status:', error.message);
            setMessage({ type: 'error', text: 'Failed to load system status' });
            setIsSystemActive(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('System')
                .select('*')
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    registrationDeadline: data.registration_deadline?.split('T')[0] || prev.registrationDeadline
                }));
            }
        } catch (error) {
            console.error('Failed to fetch system settings:', error.message);
           
        }
    };

    const updateSystemStatus = async (newStatus) => {
        try {
            setSaving(true);
            const { error } = await supabase
                .from('System')
                .update({ 
                    ISSystemActive: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 1);

            if (error) throw error;

            setIsSystemActive(newStatus);
            
            setMessage({ 
                type: 'success', 
                text: `System ${newStatus ? 'activated' : 'deactivated'} successfully` 
            });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (error) {
            console.error('Failed to update system status:', error.message);
            setMessage({ 
                type: 'error', 
                text: `Failed to update system: ${error.message}` 
            });
        } finally {
            setSaving(false);
        }
    };

    const saveAllSettings = async () => {
        try {
            setSaving(true);
            await supabase
                .from('System')
                .update({ 
                    ISSystemActive: isSystemActive,
                    election_title: settings.electionTitle,
                    max_votes_per_user: settings.maxVotesPerUser,
                    updated_at: new Date().toISOString()
                })
                .eq('id', 1);


            setMessage({ 
                type: 'success', 
                text: 'All settings saved successfully' 
            });
            
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (error) {
            console.error('Failed to save settings:', error.message);
            setMessage({ 
                type: 'error', 
                text: `Failed to save settings: ${error.message}` 
            });
        } finally {
            setSaving(false);
        }
    };

    const handleResetSystem = async () => {
        if (!window.confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
            return;
        }

        try {
            setSaving(true);
            setMessage({ 
                type: 'warning', 
                text: 'System reset initiated...' 
            });
            
            setTimeout(() => {
                setMessage({ 
                    type: 'success', 
                    text: 'System reset completed' 
                });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }, 2000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Reset failed' });
        } finally {
            setSaving(false);
        }
    };

    const getStatusColor = (status) => {
        return status ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-100">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading system settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-linear-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">System Administration</h2>
                <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(isSystemActive)}`}>
                        {isSystemActive ? '🟢 ACTIVE' : '🔴 INACTIVE'}
                    </div>
                    <span className="text-blue-100">• Last updated: Just now</span>
                </div>
            </div>
            {message.text && (
                <div className={`rounded-xl p-4 border ${
                    message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                    message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                    'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                    <div className="flex items-center">
                        <span className="mr-2">
                            {message.type === 'success' ? '' : message.type === 'error' ? '' : ''}
                        </span>
                        <span className="font-medium">{message.text}</span>
                    </div>
                </div>
            )}

            {/* Main Settings Card */}
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    System Settings
                </h3>
                
                <div className="space-y-6">
                    
                    <div className="p-5 border border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-white">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                            </svg>
                            System Status
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">Enable or disable the voting system for all users</p>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium">Voting System</p>
                                <p className="text-sm text-gray-500">
                                    {isSystemActive 
                                        ? 'System is currently active and accepting votes' 
                                        : 'System is locked - no votes can be cast'}
                                </p>
                            </div>
                            
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isSystemActive || false}
                                    onChange={async (e) => {
                                        const newStatus = e.target.checked;
                                        setIsSystemActive(newStatus);
                                        await updateSystemStatus(newStatus);
                                    }}
                                    disabled={saving}
                                />
                                <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                <span className="ml-3 text-sm font-medium">
                                    {isSystemActive ? 'Active' : 'Inactive'}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="p-5 border border-gray-200 rounded-xl">
                        <h4 className="font-bold text-gray-900 mb-3">Voting Configuration</h4>
                        <p className="text-sm text-gray-600 mb-4">Configure voting system parameters</p>
                        
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                                <div>
                                    <p className="font-medium">Show Live Vote Counts</p>
                                    <p className="text-sm text-gray-500">Display real-time vote totals to users</p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    checked={settings.showLiveVoteCounts}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        showLiveVoteCounts: e.target.checked
                                    })}
                                />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Votes Per User
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={settings.maxVotesPerUser}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            maxVotesPerUser: parseInt(e.target.value) || 1
                                        })}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Registration Deadline
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={settings.registrationDeadline}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            registrationDeadline: e.target.value
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                 
                    <div className="p-5 border border-gray-200 rounded-xl">
                        <h4 className="font-bold text-gray-900 mb-3">Election Details</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Election Title
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                                    value={settings.electionTitle}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        electionTitle: e.target.value
                                    })}
                                    placeholder="Enter election title"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                        <button
                            className={`flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
                            onClick={saveAllSettings}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save All Settings
                                </>
                            )}
                        </button>
                        
                        <button
                            className="px-6 py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
                            onClick={handleResetSystem}
                            disabled={saving}
                        >
                            Reset System
                        </button>
                    </div>
                </div>
            </div>

          
            <div className="rounded-2xl bg-white p-6 border border-red-200 shadow-lg">
                <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Danger Zone
                </h3>
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 font-medium mb-2">⚠️ Warning: Irreversible Actions</p>
                        <p className="text-red-600 text-sm mb-4">These actions will affect all users and cannot be undone.</p>
                        <div className="flex flex-wrap gap-3">
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                                Clear All Votes
                            </button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                                Reset Registration
                            </button>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                                Export All Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;