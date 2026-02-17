import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import {
    UserPlus,
    FileText,
    Upload,
    ArrowLeft,
    Shield,
    AlertCircle,
    CheckCircle,
    MapPin,
    Home,
    Award
} from 'lucide-react';
import { uploadImage } from '../Utilities/CloudinaryConfig';

export default function AspirantRegistration() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ message: '', type: '' });
    const [profilePicture, setProfilePicture] = useState(null);

    const [cloudinaryUrl, setCloudinaryUrl] = useState('');
    const [formData, setFormData] = useState({
        profilePicture: '',
        full_name: '',
        email: '',
        phone: '',
        party: '',
        seat: 'Presidential',
        county: '',
        constituency: '',
        ward: '',
        id_document: '',
        party_certificate: '',
        other_document: ''
    });

    const seats = [
        'Presidential',
        'Governor',
        'Senator',
        'MP',
        'Women Rep',
        'MCA'
    ];

    const counties = [
        "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu",
        "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
        "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui",
        "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera",
        "Marsabit", "Meru", "Migori", "Mombasa", "Murang’a", "Nairobi",
        "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri",
        "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
        "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir",
        "West Pokot"
    ];

    // Add this cleanup
    useEffect(() => {
        return () => {
            if (profilePicture) {
                URL.revokeObjectURL(profilePicture);
            }
        };
    }, [profilePicture]);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };


    const handleImagePick = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setProfilePicture(URL.createObjectURL(file));
        try {
            const imgUrl = await uploadImage(file);
            setFormData({ ...formData, [field]: imgUrl });
            setCloudinaryUrl(url);
            setStatus({
                message: `Profile picture uploaded successfully!`,
                type: 'success'
            });
           
        } catch (error) {
            setStatus({
                message: `Failed to upload profile picture. Please try again.`,
                type: 'error'
            });
            alert(`Failed to upload profile picture: ${error.message}`);
        }
    };



    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];

        if (!file) return;
        
        console.log('Uploading file:', file.name);

        const filePath = `${Date.now()}-${file.name}`;

        const { data, error } = await supabase.storage
            .from('aspirant_documents')
            .upload(filePath, file);

        if (error) {

            setStatus({ message: `Upload failed: ${error.message}`, type: 'error' });
            alert(`Upload failed: ${error.message}`);
            return;
        }

        const { data: publicUrlData } = supabase.storage
            .from('aspirant_documents')
            .getPublicUrl(filePath);

        const url = publicUrlData.publicUrl;

        setFormData({ ...formData, [field]: url });
        setStatus({
            message: `Document uploaded: ${file.name}`,
            type: 'success'
        });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('aspirant_registrations')
                .insert([{
                    ...formData,
                    status: 'pending'
                }]);

            if (error) throw error;

            setStatus({
                message: 'Registration submitted successfully! Your application is under review.',
                type: 'success'
            });
            setTimeout(() => {
                setFormData({
                    full_name: '',
                    email: '',
                    phone: '',
                    party: '',
                    seat: 'President',
                    county: '',
                    constituency: '',
                    ward: '',
                    id_document: '',
                    party_certificate: '',
                    other_document: ''
                });
                setProfilePicture(null);
                setStep(1);
            }, 2000);
        } catch (error) {
            console.error('Error submitting registration:', error);
            setStatus({
                message: 'Failed to submit registration. Please try again.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-50/30">
            <header className="bg-white border-b border-gray-200">
                <div className="mx-auto max-w-6xl px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/')}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                                    <UserPlus size={24} />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-gray-900">Aspirant Registration Portal</h1>
                                    <p className="text-xs text-gray-500">Join the election as a candidate</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl p-4 sm:p-8">

                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((stepNum) => (
                            <div key={stepNum} className="flex flex-col items-center">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${step >= stepNum
                                    ? 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                    : 'bg-gray-200 text-gray-400'}`}>
                                    {stepNum}
                                </div>
                                <span className="text-sm font-medium mt-2">
                                    {stepNum === 1 ? 'Personal Info' : stepNum === 2 ? 'Political Info' : 'Documents'}
                                </span>
                            </div>
                        ))}
                        <div className="h-1 flex-1 bg-linear-to-r from-blue-600 via-blue-400 to-gray-300 -mt-6"></div>
                    </div>
                </div>


                {status.message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${status.type === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-green-50 text-green-700 border border-green-100'}`}>
                        {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        <p className="font-medium">{status.message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">

                    {step === 1 && (
                        <div className="rounded-2xl bg-white p-8 border border-gray-200 shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
                            <p className="text-gray-500 mb-6">Please provide your personal details for verification.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* profile picture upload */}
                                <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors md:col-span-2">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
                                            {profilePicture ? (
                                                <img
                                                    src={profilePicture}
                                                    alt="Profile Preview"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <UserPlus size={24} />
                                            )}

                                            {cloudinaryUrl ? (
                                                <>
                                                    <p className="text-sm text-blue-600 mt-2">
                                                        ✓ Profile picture uploaded successfully
                                                    </p>
                                                    <p className="text-sm text-blue-600 mt-2">{cloudinaryUrl}</p>
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-500 mt-2">
                                                    No profile picture uploaded yet
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">Profile Picture </h4>
                                            <p className="text-sm text-gray-500">Upload a clear headshot for your candidate profile</p>
                                            <input
                                                type="file"
                                                accept=".jpg,.jpeg,.png"
                                                onChange={(e) => handleImagePick(e, 'profilePicture')}
                                                className="mt-2"

                                            />
                                        </div>
                                    </div>
                                </div>


                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        requiredimg
                                        value={formData.full_name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your phone number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Political Party *</label>
                                    <input
                                        type="text"
                                        name="party"
                                        required
                                        value={formData.party}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your political party"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-8">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="px-8 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                >
                                    Next: Political Information →
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="rounded-2xl bg-white p-8 border border-gray-200 shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Political Information</h2>
                            <p className="text-gray-500 mb-6">Select the position and location you wish to contest.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Position *</label>
                                    <select
                                        name="seat"
                                        required
                                        value={formData.seat}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Position</option>
                                        {seats.map(seat => (
                                            <option key={seat} value={seat}>{seat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">County *</label>
                                    <select
                                        name="county"
                                        required
                                        value={formData.county}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select County</option>
                                        {counties.map(county => (
                                            <option key={county} value={county}>{county}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Constituency</label>
                                    <input
                                        type="text"
                                        name="constituency"
                                        value={formData.constituency}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your constituency"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ward</label>
                                    <input
                                        type="text"
                                        name="ward"
                                        value={formData.ward}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter your ward"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-8 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="px-8 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                >
                                    Next: Document Upload →
                                </button>
                            </div>
                        </div>
                    )}


                    {step === 3 && (
                        <div className="rounded-2xl bg-white p-8 border border-gray-200 shadow-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Upload</h2>
                            <p className="text-gray-500 mb-6">Upload required documents for verification.</p>

                            <div className="space-y-6">
                                <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                            <FileText size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">National ID Document *</h4>
                                            <p className="text-sm text-gray-500">Upload a clear copy of your national ID</p>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => handleFileUpload(e, 'id_document')}
                                                className="mt-2"
                                            />
                                            {formData.id_document && (
                                                <p className="text-sm text-green-600 mt-2">
                                                    ✓ Document uploaded successfully
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                            <Award size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">Party Membership Certificate *</h4>
                                            <p className="text-sm text-gray-500">Upload your political party membership certificate</p>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => handleFileUpload(e, 'party_certificate')}
                                                className="mt-2"
                                            />
                                            {formData.party_certificate && (
                                                <p className="text-sm text-green-600 mt-2">
                                                    ✓ Document uploaded successfully
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                            <Upload size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">Additional Documents (Optional)</h4>
                                            <p className="text-sm text-gray-500">Any other supporting documents (campaign plan, etc.)</p>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => handleFileUpload(e, 'other_document')}
                                                className="mt-2"
                                            />
                                            {formData.other_document && (
                                                <p className="text-sm text-purple-600 mt-2">
                                                    ✓ Document uploaded successfully
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="px-8 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50"
                                >
                                    ← Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !formData.id_document || !formData.party_certificate}
                                    className="px-8 py-3 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Submitting...
                                        </span>
                                    ) : (
                                        'Submit Application'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <div className="mt-8 rounded-2xl bg-linear-to-r from-blue-50 to-indigo-50 p-6 border border-blue-200">
                    <div className="flex items-start gap-4">
                        <Shield className="h-6 w-6 text-blue-600 mt-1" />
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">Important Information</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>• All applications undergo verification by the electoral commission</li>
                                <li>• You will be notified via email once your application is reviewed</li>
                                <li>• Approved candidates will appear in the voting portal immediately</li>
                                <li>• Ensure all documents are clear and valid before submission</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}