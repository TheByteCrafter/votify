const SystemLocked = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                <h1 className="text-3xl font-bold text-red-600 mb-4">System Locked</h1>
                <p className="text-gray-700">The system is currently locked. Please try again later.</p>
            </div>
        </div>
    );
}
export default SystemLocked;