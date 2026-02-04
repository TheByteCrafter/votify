const SystemLocked = () => {
  const currentTime = new Date();
  const isMaintenanceHours = currentTime.getHours() >= 22 || currentTime.getHours() < 6;
  
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden">
      
      <div className="absolute inset-0 z-0">
        <div className="h-1/3 w-full bg-black"></div>
        <div className="h-1/3 w-full bg-red-600"></div>
        <div className="h-1/3 w-full bg-green-600"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-green-600/5"></div>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-64 h-64 border-4 border-white/10 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-32 bg-yellow-400/10 rotate-45 rounded-md"></div>
            </div>
          </div>
        </div>
      </div>

    
      <div className="relative z-10 max-w-2xl w-full">
     
        <div className="flex justify-center gap-2 mb-8">
          <div className="w-3 h-3 rounded-full bg-black"></div>
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-t-8 border-b-8 border-red-600 overflow-hidden">

          <div className="h-3 flex">
            <div className="flex-1 bg-black"></div>
            <div className="flex-1 bg-red-600"></div>
            <div className="flex-1 bg-green-600"></div>
            <div className="flex-1 bg-white relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-red-600 transform rotate-45"></div>
                <div className="absolute w-4 h-16 bg-white"></div>
                <div className="absolute h-4 w-16 bg-white"></div>
              </div>
            </div>
          </div>

          <div className="p-10 text-center">
            <div className="relative flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-20"></div>
                <div className="relative bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl shadow-lg border-4 border-red-100">
                 
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-20 w-20 text-red-600"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                   
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
                    />
                  
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      className="text-black"
                    />
                  </svg>
              
                  <div className="absolute -top-2 -right-2 text-yellow-400">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

           
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              <span className="bg-linear-to-r from-black via-red-600 to-green-600 bg-clip-text text-transparent">
                Electoral System {isMaintenanceHours ? 'Under Maintenance' : 'Temporarily Closed'}
              </span>
            </h1>
            
       
            <div className="flex justify-center items-center gap-2 mb-8">
              <div className="w-8 h-1 bg-black rounded-full"></div>
              <div className="w-8 h-1 bg-red-600 rounded-full"></div>
              <div className="w-8 h-1 bg-green-600 rounded-full"></div>
              <div className="w-8 h-4 relative">
                <div className="absolute inset-0 bg-red-600 transform rotate-45"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-4 bg-white"></div>
                  <div className="h-1 w-4 bg-white"></div>
                </div>
              </div>
              <div className="w-8 h-1 bg-green-600 rounded-full"></div>
              <div className="w-8 h-1 bg-red-600 rounded-full"></div>
              <div className="w-8 h-1 bg-black rounded-full"></div>
            </div>

            <div className="mb-8">
              <p className="text-gray-700 text-lg leading-relaxed mb-4">
                The <span className="font-semibold text-red-600">Votify System</span> is currently{' '}
                <span className="font-bold text-black">{isMaintenanceHours ? 'undergoing scheduled maintenance' : 'not active'}</span>.
              </p>
              
              <div className="bg-linear-to-r from-red-50 to-green-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
                <p className="text-gray-800 text-left">
                  <span className="font-bold text-black">Next Voting Session:</span><br/>
                  Please refer to the official Votify
                  schedule for accurate timing of election periods.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-800">System Status</span>
                  </div>
                  <span className="text-xs text-gray-600">CLOSED</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-semibold text-gray-800">Maintenance Mode</span>
                  </div>
                  <span className="text-xs text-gray-600">{isMaintenanceHours ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
              </div>
            </div>

          
            <div className="space-y-4">
              <div className="bg-linear-to-r from-black/5 to-red-600/5 p-4 rounded-xl border border-red-100">
                <h3 className="font-bold text-black mb-2">For Assistance Contact:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="text-left">
                    <span className="text-gray-600">Votify Helpline:</span>
                    <p className="font-semibold text-red-600">0712345678</p>
                  </div>
                  <div className="text-left">
                    <span className="text-gray-600">Email Support:</span>
                    <p className="font-semibold text-green-600">support@votifykenya.org</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold text-yellow-700">Official Hours</span>
                </div>
                <p className="text-sm text-yellow-800">
                  Voting typically available: <span className="font-bold">as per schedule</span>
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2 mb-2 md:mb-0">
                  <div className="w-4 h-4 bg-linear-to-r from-black via-red-600 to-green-600 rounded-sm"></div>
                  <span>Votify Secure Voting Portal v2.0</span>
                </div>
                <div className="text-center">
                  <p className="font-mono">
                    Ref: SYS-KEN-{currentTime.getFullYear()}-{String(currentTime.getMonth() + 1).padStart(2, '0')}
                    -{String(currentTime.getDate()).padStart(2, '0')}
                  </p>
                  <p className="text-gray-400 mt-1">
                    {currentTime.toLocaleTimeString('en-KE', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZone: 'Africa/Nairobi'
                    })} EAT
                  </p>
                </div>
              </div>
            </div>
          </div>

          
          <div className="h-3 flex">
            <div className="flex-1 bg-green-600"></div>
            <div className="flex-1 bg-white relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-red-600 transform rotate-45"></div>
                <div className="absolute w-2 h-8 bg-white"></div>
                <div className="absolute h-2 w-8 bg-white"></div>
              </div>
            </div>
            <div className="flex-1 bg-red-600"></div>
            <div className="flex-1 bg-black"></div>
          </div>
        </div>
      </div>


      <div className="absolute bottom-10 left-10 text-xs text-gray-400/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
          <span>Secure • Encrypted • Verified</span>
        </div>
      </div>
      <div className="absolute top-10 right-10 text-xs text-gray-400/50">
        <div className="flex items-center gap-2">
          <span>🇰🇪 Republic of Kenya</span>
          <div className="w-2 h-2 bg-red-600 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default SystemLocked;