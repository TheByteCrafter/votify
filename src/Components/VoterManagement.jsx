import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Trash2,
  MapPin,
  Search,
  User,
  IdCard,
  X,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  Layers,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../supabase';

const VoterManagement = () => {
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modalValidationErrors, setModalValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    full_name: '',
    id_number: '',
    email: '',
    phone_number: '',
    county: '',
    constituency: '',
    ward: ''
  });

  // Clear notifications after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch data function
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError({
        message: 'Failed to fetch voter records',
        details: err.message,
        type: 'fetch'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Validation functions
  const validateForm = () => {
    const errors = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = 'Name must be at least 2 characters';
    }

    if (!formData.id_number.trim()) {
      errors.id_number = 'ID number is required';
    } else if (!/^\d{7,8}$/.test(formData.id_number.trim())) {
      errors.id_number = 'Invalid ID number format (7-8 digits)';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Invalid email address';
    }

    if (!formData.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    } else if (!/^(\+254|0)[17]\d{8}$/.test(formData.phone_number.trim())) {
      errors.phone_number = 'Invalid Kenyan phone number';
    }

    const duplicateId = profiles.find(p =>
      p.id_number === formData.id_number.trim()
    );
    if (duplicateId) {
      errors.id_number = `ID number ${formData.id_number} already registered.`;
    }

    const duplicatePhone = profiles.find(p =>
      p.phone_number === formData.phone_number.trim()
    );
    if (duplicatePhone) {
      errors.phone_number = `Phone number already registered.`;
    }

    const duplicateEmail = profiles.find(p =>
      p.email === formData.email.trim()
    );
    if (duplicateEmail) {
      errors.email = `Email already registered.`;
    }

    if (!formData.county.trim()) errors.county = 'County is required';
    if (!formData.constituency.trim()) errors.constituency = 'Constituency is required';
    if (!formData.ward.trim()) errors.ward = 'Ward is required';

    return errors;
  };

  // Clear modal validation errors when modal closes
  useEffect(() => {
    if (!isAddingUser) {
      setModalValidationErrors({});
      setError(null);
    }
  }, [isAddingUser]);

  const filteredProfiles = profiles.filter(profile =>
    profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.id_number?.includes(searchTerm) ||
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.phone_number?.includes(searchTerm) ||
    profile.county?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.constituency?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    const profile = profiles.find(p => p.id === id);
    const confirmation = window.confirm(
      `Are you sure you want to remove voter record for ${profile?.full_name} (ID: ${profile?.id_number})? This action cannot be undone.`
    );

    if (!confirmation) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess({
        message: 'Voter record deleted successfully',
        type: 'delete'
      });
      await fetchProfiles();
    } catch (err) {
      setError({
        message: 'Failed to delete voter record',
        details: err.message,
        type: 'delete'
      });
      setLoading(false);
    }
  };

  const handleAddVoter = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setError(null);
    setModalValidationErrors({});

    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setModalValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // Check for duplicates by ID number and phone
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .or(`id_number.eq.${formData.id_number.trim()},phone_number.eq.${formData.phone_number.trim()},email.eq.${formData.email.trim()}`);

      if (checkError) throw checkError;

      if (existingProfiles && existingProfiles.length > 0) {
        // Check each type of duplicate
        const duplicateId = existingProfiles.find(p => p.id_number === formData.id_number.trim());
        const duplicatePhone = existingProfiles.find(p => p.phone_number === formData.phone_number.trim());
        const duplicateEmail = existingProfiles.find(p => p.email === formData.email.trim());

        if (duplicateId) {
          throw new Error(`ID number ${formData.id_number} already registered to ${duplicateId.full_name}.`);
        }
        if (duplicatePhone) {
          throw new Error(`Phone number ${formData.phone_number} already registered to ${duplicatePhone.full_name}.`);
        }
        if (duplicateEmail) {
          throw new Error(`Email ${formData.email} already registered to ${duplicateEmail.full_name}.`);
        }
      }

      const temporaryPassword = `Voter@${formData.id_number.slice(-4)}`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: temporaryPassword,
        options: {
          data: {
            full_name: formData.full_name.trim(),
            id_number: formData.id_number.trim(),
            phone_number: formData.phone_number.trim(),
            user_type: 'voter'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          // User already exists in auth - try to sign in
          const { data: existingUser, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email.trim(),
            password: temporaryPassword
          });

          if (signInError || !existingUser?.user) {
            throw new Error(`Email ${formData.email} already registered with different password.`);
          }

          const userId = existingUser.user.id;

          // Check if profile exists for this user ID
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id, full_name, id_number, email')
            .eq('id', userId)
            .single();

          if (profileCheckError && profileCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw profileCheckError;
          }

          if (existingProfile) {
            // Profile exists - UPDATE it instead of inserting
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                full_name: formData.full_name.trim(),
                id_number: formData.id_number.trim(),
                email: formData.email.trim(), // Add the missing email
                phone_number: formData.phone_number.trim(),
                county: formData.county.trim(),
                constituency: formData.constituency.trim(),
                ward: formData.ward.trim(),
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (updateError) throw updateError;

            setSuccess({
              message: 'Voter profile updated successfully!',
              type: 'add',
              details: `Added email to existing voter record.`
            });
          } else {
            // No profile exists - create new one
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                full_name: formData.full_name.trim(),
                id_number: formData.id_number.trim(),
                email: formData.email.trim(),
                phone_number: formData.phone_number.trim(),
                county: formData.county.trim(),
                constituency: formData.constituency.trim(),
                ward: formData.ward.trim(),
                updated_at: new Date().toISOString()
              });

            if (profileError) throw profileError;

            setSuccess({
              message: 'Voter registered successfully!',
              type: 'add',
              details: `Email: ${formData.email}, Password: Voter@${formData.id_number.slice(-4)}`
            });
          }

        } else {
          throw new Error(`Failed to create user: ${authError.message}`);
        }
      } else if (!authData.user) {
        throw new Error('User creation failed - no user data returned');
      } else {
        // New user created - create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: formData.full_name.trim(),
            id_number: formData.id_number.trim(),
            email: formData.email.trim(),
            phone_number: formData.phone_number.trim(),
            county: formData.county.trim(),
            constituency: formData.constituency.trim(),
            ward: formData.ward.trim(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          if (profileError.code === '23505' && profileError.message.includes('profiles_pkey')) {
            // Profile already exists - this shouldn't happen for new users
            // But if it does, update it
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                full_name: formData.full_name.trim(),
                id_number: formData.id_number.trim(),
                email: formData.email.trim(),
                phone_number: formData.phone_number.trim(),
                county: formData.county.trim(),
                constituency: formData.constituency.trim(),
                ward: formData.ward.trim(),
                updated_at: new Date().toISOString()
              })
              .eq('id', authData.user.id);

            if (updateError) throw updateError;

            setSuccess({
              message: 'Voter profile updated successfully!',
              type: 'add'
            });
          } else {
            throw profileError;
          }
        } else {
          setSuccess({
            message: 'Voter registered successfully!',
            type: 'add',
            details: `Email: ${formData.email}, Password: Voter@${formData.id_number.slice(-4)}`
          });
        }
      }

      // Reset form
      setFormData({
        full_name: '',
        id_number: '',
        email: '',
        phone_number: '',
        county: '',
        constituency: '',
        ward: ''
      });
      setIsAddingUser(false);
      await fetchProfiles();
    } catch (err) {
      console.error("Registration error:", err);
      setError({
        message: 'Failed to register voter',
        details: err.message,
        type: 'add'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (modalValidationErrors[field]) {
      setModalValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Voter Registry</h3>
          <p className="text-slate-500 text-sm font-medium">
            {loading ? 'Synchronizing with Supabase...' : `${profiles.length} Total Records Found`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, ID, email, phone, or location..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsAddingUser(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <UserPlus size={18} />
            Add Voter
          </button>
        </div>
      </div>

      {error && (
        <div className="relative z-50 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">{error.message}</p>
            <p className="text-xs text-red-600/80">{error.details}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="relative z-50 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">{success.message}</p>
            {success.details && (
              <p className="text-xs text-emerald-600/80 mt-1">{success.details}</p>
            )}
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="p-1 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Grid View */}
      {loading && profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
          <p className="font-bold uppercase tracking-widest text-xs">Accessing Secure Registry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProfiles.map(profile => (
            <div key={profile.id} className="group bg-white border border-slate-200 rounded-[2rem] p-6 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(profile.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete voter record"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 font-black text-xl border border-slate-200 group-hover:from-blue-50 group-hover:to-blue-100 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                  {profile.full_name?.charAt(0) || 'V'}
                </div>
                <div className="pr-8">
                  <p className="font-black text-slate-900 text-lg leading-tight mb-1">{profile.full_name || 'No Name'}</p>
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                    <IdCard size={14} />
                    <span className="text-xs font-bold uppercase tracking-tighter">ID: {profile.id_number || 'No ID'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 text-sm text-slate-600 font-semibold">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Mail size={14} className="text-blue-500" />
                  </div>
                  <span className="truncate">{profile.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-semibold">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Phone size={14} className="text-emerald-500" />
                  </div>
                  <span>{profile.phone_number || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <MapPin size={14} className="text-blue-500" />
                  </div>
                  <span className="truncate">{profile.county || 'N/A'} • {profile.constituency || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Layers size={14} className="text-indigo-500" />
                  </div>
                  <span className="truncate font-medium">Ward: <span className="font-bold text-slate-900">{profile.ward || 'N/A'}</span></span>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'Pending'}
                </span>
                <div className="flex items-center gap-1.5 py-1 px-3 bg-emerald-50 rounded-full">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tight">Verified Voter</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredProfiles.length === 0 && !loading && (
        <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-3xl mb-6">
            <Search className="text-slate-200" size={40} />
          </div>
          <h4 className="text-lg font-black text-slate-900 mb-2">No Records Found</h4>
          <p className="text-slate-400 font-medium max-w-xs mx-auto text-sm">
            {searchTerm ? `No voters found matching "${searchTerm}"` : 'No voter records in database. Add your first voter!'}
          </p>
        </div>
      )}

      {/* Add Voter Modal */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Register Voter</h3>
                <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mt-1">Live Supabase Node</p>
              </div>
              <button
                onClick={() => setIsAddingUser(false)}
                className="p-2 hover:bg-white hover:shadow-sm rounded-2xl transition-all"
                disabled={loading}
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddVoter} className="p-8 space-y-6">
              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Full Legal Name
                    {modalValidationErrors.full_name && (
                      <span className="text-red-500 ml-2">✗ {modalValidationErrors.full_name}</span>
                    )}
                  </label>
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${modalValidationErrors.full_name ? 'text-red-300' : 'text-slate-300'
                      }`} size={18} />
                    <input
                      required
                      className={`w-full pl-12 pr-4 py-4 bg-slate-50 border ${modalValidationErrors.full_name ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-blue-500/10'
                        } rounded-2xl focus:ring-4 focus:border-blue-500 outline-none text-sm font-semibold transition-all`}
                      placeholder="Jane Maridadi"
                      value={formData.full_name}
                      onChange={e => handleInputChange('full_name', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      ID Number
                      {modalValidationErrors.id_number && (
                        <span className="text-red-500 ml-2">✗ {modalValidationErrors.id_number}</span>
                      )}
                    </label>
                    <input
                      required
                      className={`w-full px-5 py-4 bg-slate-50 border ${modalValidationErrors.id_number ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-blue-500/10'
                        } rounded-2xl focus:ring-4 focus:border-blue-500 outline-none text-sm font-semibold transition-all`}
                      placeholder="12345678"
                      value={formData.id_number}
                      onChange={e => handleInputChange('id_number', e.target.value)}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Email Address
                      {modalValidationErrors.email && (
                        <span className="text-red-500 ml-2">✗ {modalValidationErrors.email}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${modalValidationErrors.email ? 'text-red-300' : 'text-slate-300'
                        }`} size={18} />
                      <input
                        type="email"
                        required
                        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border ${modalValidationErrors.email ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-blue-500/10'
                          } rounded-2xl focus:ring-4 focus:border-blue-500 outline-none text-sm font-semibold transition-all`}
                        placeholder="voter@example.com"
                        value={formData.email}
                        onChange={e => handleInputChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Phone
                      {modalValidationErrors.phone_number && (
                        <span className="text-red-500 ml-2">✗ {modalValidationErrors.phone_number}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 ${modalValidationErrors.phone_number ? 'text-red-300' : 'text-slate-300'
                        }`} size={18} />
                      <input
                        required
                        className={`w-full pl-12 pr-4 py-4 bg-slate-50 border ${modalValidationErrors.phone_number ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-blue-500/10'
                          } rounded-2xl focus:ring-4 focus:border-blue-500 outline-none text-sm font-semibold transition-all`}
                        placeholder="+254712345678"
                        value={formData.phone_number}
                        onChange={e => handleInputChange('phone_number', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      County
                      {modalValidationErrors.county && (
                        <span className="text-red-500 ml-2">✗ {modalValidationErrors.county}</span>
                      )}
                    </label>
                    <input
                      required
                      className={`w-full px-5 py-4 bg-slate-50 border ${modalValidationErrors.county ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-blue-500/10'
                        } rounded-2xl focus:ring-4 focus:border-blue-500 outline-none text-sm font-semibold transition-all`}
                      placeholder="Nairobi"
                      value={formData.county}
                      onChange={e => handleInputChange('county', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Constituency
                      {modalValidationErrors.constituency && (
                        <span className="text-red-500 ml-2">✗ {modalValidationErrors.constituency}</span>
                      )}
                    </label>
                    <input
                      required
                      className={`w-full px-5 py-4 bg-slate-50 border ${modalValidationErrors.constituency ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-blue-500/10'
                        } rounded-2xl focus:ring-4 focus:border-blue-500 outline-none text-sm font-semibold transition-all`}
                      placeholder="Westlands"
                      value={formData.constituency}
                      onChange={e => handleInputChange('constituency', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Ward
                      {modalValidationErrors.ward && (
                        <span className="text-red-500 ml-2">✗ {modalValidationErrors.ward}</span>
                      )}
                    </label>
                    <input
                      required
                      className={`w-full px-5 py-4 bg-slate-50 border ${modalValidationErrors.ward ? 'border-red-200 focus:ring-red-500/10' : 'border-slate-100 focus:ring-blue-500/10'
                        } rounded-2xl focus:ring-4 focus:border-blue-500 outline-none text-sm font-semibold transition-all`}
                      placeholder="Parklands"
                      value={formData.ward}
                      onChange={e => handleInputChange('ward', e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Info */}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={16} className="text-blue-500" />
                    <p className="text-sm font-semibold text-blue-700">Login Information</p>
                  </div>
                  <p className="text-xs text-blue-600">
                    Password will be auto-generated: <span className="font-mono font-bold">Voter@{formData.id_number ? formData.id_number.slice(-4) : 'XXXX'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Validation Summary */}
                {Object.keys(modalValidationErrors).length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <p className="text-sm font-semibold text-red-700">Please fix the following errors:</p>
                    </div>
                    <ul className="text-xs text-red-600 space-y-1 pl-6">
                      {Object.entries(modalValidationErrors).map(([key, error], index) => (
                        error && <li key={index} className="list-disc">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 text-base font-black text-white bg-blue-600 rounded-3xl hover:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                  {loading ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterManagement;