
const WaveLoader = () => {
  return (
    <div className="flex items-center justify-center space-x-1 h-screen ">
      <div className="w-2 h-6 bg-blue-500 animate-wave delay-0"></div>
      <div className="w-2 h-6 bg-blue-500 animate-wave delay-100"></div>
      <div className="w-2 h-6 bg-blue-500 animate-wave delay-200"></div>
      <div className="w-2 h-6 bg-blue-500 animate-wave delay-300"></div>
      <div className="w-2 h-6 bg-blue-500 animate-wave delay-400"></div>
    </div>
  );
};

export default WaveLoader;