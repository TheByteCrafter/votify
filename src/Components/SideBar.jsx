
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, LogOut } from 'lucide-react'; // Icons

const Sidebar = ({ userRole = 'public' }) => {
    return (
        <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col shrink-0 h-full">
            <div className="p-6 border-b border-slate-800 font-black text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center text-xs">IEBC</div>
                EMS <span className="text-emerald-500">v3</span>
            </div>

            <nav className="flex-1 py-6 space-y-1">
                {/* Everyone sees Overview */}
                <SidebarLink to="/" icon={<LayoutDashboard size={18} />} label="Live Tally" />

                {/* Only Admins see these */}
                {userRole === 'admin' && (
                    <>
                        <div className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Administration</div>
                        <SidebarLink to="/management" icon={<Users size={18} />} label="Manage Candidates" />
                        <SidebarLink to="/audit" icon={<ShieldCheck size={18} />} label="Security Audit" />
                    </>
                )}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button className="flex items-center gap-3 px-4 py-2 w-full hover:bg-slate-800 rounded transition text-sm">
                    <LogOut size={18} /> Exit System
                </button>
            </div>
        </aside>
    );
};

// Small helper component for links
function SidebarLink({ to, icon, label }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-semibold transition ${isActive ? 'bg-slate-800 text-emerald-500 border-r-4 border-emerald-500' : 'hover:text-white hover:bg-slate-800/50'
                }`
            }
        >
            {icon} {label}
        </NavLink>
    );
}


export default Sidebar;