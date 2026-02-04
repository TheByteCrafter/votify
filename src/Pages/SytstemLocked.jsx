import React from 'react';

const SystemLocked = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border-t-8 border-blue-900 text-center">
                {/* Voting/Lock Icon */}
                <div className="flex justify-center mb-6">
                    <div className="bg-red-100 p-4 rounded-full">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-12 w-12 text-red-600" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl font-extrabold text-slate-800 mb-2 uppercase tracking-wide">
                    Election Portal Offline
                </h1>
                
                <div className="w-16 h-1 bg-blue-900 mx-auto mb-6 rounded-full"></div>

                <p className="text-slate-600 leading-relaxed mb-8">
                    The voting system is currently <span className="font-semibold text-slate-800">closed or undergoing maintenance</span>. 
                    Please check the official election schedule for session times.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-2">
                    <p className="text-sm text-blue-800 font-medium">
                        Need assistance? Contact the Election Admin.
                    </p>
                </div>
                
                <p className="text-xs text-slate-400 mt-6 italic">
                    Reference ID: SYS-LOCKED-{new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}

export default SystemLocked;