import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { User, CreditCard, Phone, MapPin, Mail, Lock, ArrowLeft } from 'lucide-react';

export default function RegisterVoter() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        idNumber: '',
        phoneNumber: '',
        county: '',
        constituency: '',
        ward: ''
    });

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Check if profile already exists
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .or(`id_number.eq.${formData.idNumber},phone_number.eq.${formData.phoneNumber}`)
            .limit(2); // fetch up to 2 rows

        if (profileError) {
            console.error("Query failed:", profileError.message);
            setLoading(false);
            return;
        }

        if (!profiles || profiles.length === 0) {
            // No match found
            console.log("No existing profile found, safe to proceed.");
        } else if (profiles.length === 1) {
            // Exactly one match
            alert("User already exists in profiles");
            setLoading(false);
            return;
        } else {
            // More than one match
            console.warn("Multiple profiles found with same ID/phone!");
            alert("User already exists in profiles");
            setLoading(false);
            return;
        }

        // Sign up user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                    id_number: formData.idNumber,
                    phone_number: formData.phoneNumber,
                    county: formData.county,
                    constituency: formData.constituency,
                    ward: formData.ward,
                },
            },
        });

        setLoading(false);

        if (signUpError) {
            alert("Error: " + signUpError.message);
            return;
        }

        if (signUpData?.user) {
            await supabase.from('profiles').insert({
                id: signUpData.user.id, // link to auth user
                full_name: formData.fullName,
                id_number: formData.idNumber,
                phone_number: formData.phoneNumber,
                county: formData.county,
                constituency: formData.constituency,
                ward: formData.ward,
            });
        }

        alert("Registration successful! Please check your email to verify your account.");
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 py-12">
            <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">

                <div className="p-8 md:p-12">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-bold text-xs uppercase tracking-widest mb-8 transition"
                    >
                        <ArrowLeft size={16} /> Back to Login
                    </button>

                    <h2 className="text-3xl font-black text-slate-800 mb-2">Voter Registration</h2>
                    <p className="text-slate-500 mb-10 font-medium">Create your secure account to participate in the upcoming elections.</p>

                    <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                        {/* Account Credentials */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                            <InputGroup icon={<Mail size={18} />} label="Email Address" type="email" placeholder="voter@example.com"
                                onChange={val => setFormData({ ...formData, email: val })} />

                            <InputGroup icon={<Lock size={18} />} label="Security Password" type="password" placeholder="••••••••"
                                onChange={val => setFormData({ ...formData, password: val })} />
                        </div>

                        {/* Personal Info */}
                        <div className="space-y-6">
                            <InputGroup icon={<User size={18} />} label="Full Name" placeholder="As per National ID"
                                onChange={val => setFormData({ ...formData, fullName: val })} />

                            <InputGroup icon={<CreditCard size={18} />} label="ID Number" placeholder="8 digits"
                                onChange={val => setFormData({ ...formData, idNumber: val })} />

                            <InputGroup icon={<Phone size={18} />} label="Phone Number" placeholder="+254..."
                                onChange={val => setFormData({ ...formData, phoneNumber: val })} />
                        </div>

                        {/* Location Info */}
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">County</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-3.5 rounded-xl outline-none focus:border-emerald-500 appearance-none font-medium text-slate-700"
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                    >
                                        <option value="">Select County</option>
                                        <option value="Nairobi">Nairobi</option>
                                        <option value="Mombasa">Mombasa</option>
                                        <option value="Kiambu">Kiambu</option>
                                    </select>
                                </div>
                            </div>

                            <InputGroup icon={<MapPin size={18} />} label="Constituency" placeholder="e.g. Westlands"
                                onChange={val => setFormData({ ...formData, constituency: val })} />

                            <InputGroup icon={<MapPin size={18} />} label="Ward" placeholder="e.g. Kitisuru"
                                onChange={val => setFormData({ ...formData, ward: val })} />
                        </div>

                        <button
                            disabled={loading}
                            className="md:col-span-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-black rounded-2xl transition shadow-lg shadow-emerald-200 mt-4 uppercase tracking-widest"
                        >
                            {loading ? "Processing..." : "Register as Voter"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

function InputGroup({ icon, label, placeholder, type = "text", onChange }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-wider">{label}</label>
            <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">{icon}</span>
                <input
                    type={type}
                    required
                    placeholder={placeholder}
                    className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-3.5 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium text-slate-700"
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}