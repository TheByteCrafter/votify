
import {supabase} from "../../supabase";
import { useState } from "react";
import React from "react";

const AdminSettings = () => {

    const [isSystemActive, setIsSystemActive] = React.useState(null);
    React.useEffect(() => {
        const fetchSystemStatus = async () => {
            const { data, error } = await supabase
                .from('System')
                .select('ISSystemActive')
                .single();

            if (!error && data) {
                setIsSystemActive(data.ISSystemActive);
            } else {
                setIsSystemActive(false); 
            }
        };

        fetchSystemStatus();
    }, []);

    const updateSystemStatus = async (newStatus) => {

        alert('System Active status changed to: ' + newStatus);
        const { error } = await supabase
            .from('System')
            .update({ ISSystemActive: newStatus })
            .eq('id', 1);
        if (error) {
            alert('Failed to update system status: ' + error.message);
            console.error('Failed to update system status:', error.message);
        }else{
            console.log('System status updated successfully');
            alert('System status updated successfully');
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-6">System Settings</h3>
                <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-xl">
                        <h4 className="font-bold text-gray-900 mb-2">Voting Configuration</h4>
                        <p className="text-sm text-gray-600 mb-3">Configure voting system parameters</p>
                        <div className="space-y-3">
                            <label className="flex items-center cursor-pointer">
                                <span className="text-sm font-medium text-red-700 mr-3">System Active</span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isSystemActive || false}
                                        onChange={async (e) => {
                                            const newStatus = e.target.checked;
                                            setIsSystemActive(newStatus);
                                            await updateSystemStatus(newStatus);
                                        }}
                                    />
                                    
                                    <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                                  
                                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md 
                    peer-checked:translate-x-5 transition-transform"></div>
                                </div>
                            </label>
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

                    <button className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>

    )
}
export default AdminSettings;