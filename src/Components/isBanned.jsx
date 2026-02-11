import { Ban, ShieldAlert, Clock, AlertCircle } from 'lucide-react';
const BanScreen = ({ failedAttempts, banTimeRemaining }) => {
    return(
         <div className="min-h-screen bg-gradient-to-br from-red-900 to-rose-900 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-lg bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-2xl mb-6">
              <Ban className="w-10 h-10 text-red-300" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Access Temporarily Restricted</h1>
            <p className="text-rose-200">Security protocol activated</p>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="h-6 w-6 text-red-300" />
                <h2 className="text-xl font-bold text-white">Multiple Failed Attempts</h2>
              </div>
              <p className="text-red-100 mb-4">
                {failedAttempts >= 5
                  ? 'Multiple suspicious login attempts detected. This is a security measure to prevent unauthorized access.'
                  : 'Too many failed login attempts. Please wait before trying again.'}
              </p>

              <div className="flex items-center justify-between bg-red-900/30 p-4 rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-300" />
                  <span className="text-red-200 font-medium">Time remaining:</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {Math.floor(banTimeRemaining / 60)}:{String(banTimeRemaining % 60).padStart(2, '0')}
                </div>
              </div>

              <p className="text-red-200/80 text-sm">
                Attempts: <span className="font-bold">{failedAttempts}</span> •
                System will unlock automatically
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-300 mt-0.5" />
                <div>
                  <p className="text-amber-100 font-medium mb-1">Security Notice</p>
                  <p className="text-amber-200/80 text-sm">
                    {failedAttempts >= 5
                      ? '⚠️ Further violations may result in permanent IP restriction.'
                      : 'Each violation increases lock duration. Please verify your credentials.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
              >
                Refresh Status
              </button>

            
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-white/50 text-sm">
              Security Incident #{Date.now().toString().slice(-6)} • {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    )
}

export default BanScreen;