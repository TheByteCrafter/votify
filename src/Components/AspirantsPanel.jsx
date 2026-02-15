import React, { useEffect, useState } from 'react';
import { Search, PlusCircle, RefreshCw, MapPin, Home, Edit2, Trash2, X, AlertCircle, Loader2, User, Mail, Phone, Calendar, Hash } from 'lucide-react';
import { supabase } from '../../supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Printer } from 'lucide-react';
const AspirantPanel = ({
    aspirants: propAspirants,
    votes: propVotes,
    registrations: propRegistrations,
    profiles: propProfiles,
    onRefresh,
    loading: propLoading
}) => {

    // State Viarables and Contacts
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSeat, setFilterSeat] = useState('all');
    const aspirants = propAspirants || [];
    const votes = propVotes || {};
    const registrations = propRegistrations || [];
    const profiles = propProfiles || [];
    const loading = propLoading || false;
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAspirant, setEditingAspirant] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        party: '',
        seat: 'MP',
        county: '',
        constituency: '',
        ward: ''
    });

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [showVoterModal, setShowVoterModal] = useState(false);
    const [selectedAspirant, setSelectedAspirant] = useState(null);
    const [voterDetails, setVoterDetails] = useState([]);
    const [loadingVoters, setLoadingVoters] = useState(false);
    const [voterSearchTerm, setVoterSearchTerm] = useState('');


    // Calculate Statics 
    const stats = {
        totalVotes: Object.values(votes).reduce((sum, count) => sum + count, 0),
        totalVoters: profiles.length,
        totalAspirants: aspirants.length,
        pendingRegistrations: registrations.filter(r => r.status === 'pending').length,
        approvedRegistrations: registrations.filter(r => r.status === 'approved').length,
        rejectedRegistrations: registrations.filter(r => r.status === 'rejected').length
    };

    const seats = [
        'Presidential',
        'Governor',
        'Senator',
        'MP',
        'Women Rep',
        'MCA'
    ];

    const counties = [
        'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu',
        'Kakamega', 'Bungoma', 'Siaya', 'Kisii', 'Nyamira',
        'Migori', 'Homa Bay', 'Kericho', 'Bomet', 'Nandi',
        'Trans Nzoia', 'West Pokot', 'Turkana', 'Marsabit', 'Mandera',
        'Wajir', 'Garissa', 'Tana River', 'Lamu', 'Kilifi',
        'Kwale', 'Taita Taveta', 'Makueni', 'Machakos', 'Kitui',
        'Meru', 'Tharaka Nithi', 'Embu', 'Kirinyaga', 'Muranga',
        'Kiambu', 'Nyandarua', 'Nyeri', 'Laikipia', 'Samburu',
        'Isiolo', 'Elgeyo Marakwet', 'Baringo', 'Narok', 'Kajiado'
    ];


    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null);
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);


    useEffect(() => {
        console.log('Votes received in AspirantPanel:', votes);
    }, [votes]);

    useEffect(() => {
        const interval = setInterval(() => {
            onRefresh();
        }, 5000);
        return () => clearInterval(interval);
    }, [onRefresh]);

    const handleResetVotes = async () => {
        if (!window.confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('user_votes')
                .delete()
                .not('aspirant_id', 'is', null);

            if (error) throw error;
            setSuccess('All votes have been reset successfully.');
            onRefresh();
        } catch (error) {
            console.error('Error resetting votes:', error);
            setError('Failed to reset votes. Please try again.');
        }
    };


 const handlePrintElectionResults = async () => {
    try {
        // Fetch data with proper relationship
        const { data, error } = await supabase
            .from("aspirants")
            .select(`
                id,
                name,
                party,
                seat,
                county,
                constituency,
                ward,
                user_votes(count)
            `);

        if (error) {
            console.error("Error fetching results:", error);
            return;
        }

        // Extract vote counts
        const processedData = data.map(a => ({
            ...a,
            voteCount: a.user_votes?.[0]?.count || 0
        }));

        // Define seat hierarchies
        const seatConfig = {
            // National seats (1 result total)
            'President': { type: 'national', hierarchy: ['country'], displayName: 'President' },
            
            // County-level seats (47 results - one per county)
            'Governor': { type: 'county', hierarchy: ['county'], displayName: 'Governor' },
            'Senator': { type: 'county', hierarchy: ['county'], displayName: 'Senator' },
            'Woman Representative': { type: 'county', hierarchy: ['county'], displayName: 'Woman Rep' },
            
            // Constituency-level seats (290 results - one per constituency)
            'Member of Parliament': { type: 'constituency', hierarchy: ['county', 'constituency'], displayName: 'MP' },
            
            // Ward-level seats (1450 results - one per ward)
            'Member of County Assembly': { type: 'ward', hierarchy: ['county', 'constituency', 'ward'], displayName: 'MCA' }
        };

        // Organize results by seat type and geographic hierarchy
        const organizedResults = {
            national: {},      // President
            county: {},        // Governor, Senator, Woman Rep grouped by county
            constituency: {},  // MP grouped by constituency
            ward: {}          // MCA grouped by ward
        };

        processedData.forEach(a => {
            const config = seatConfig[a.seat];
            if (!config) return; // Skip if seat type not configured

            const resultItem = {
                id: a.id,
                candidate: a.name,
                party: a.party,
                seat: a.seat,
                seatDisplay: config.displayName,
                votes: a.voteCount,
                county: a.county || 'N/A',
                constituency: a.constituency || 'N/A',
                ward: a.ward || 'N/A'
            };

            switch (config.type) {
                case 'national':
                    if (!organizedResults.national[a.seat]) {
                        organizedResults.national[a.seat] = [];
                    }
                    organizedResults.national[a.seat].push(resultItem);
                    break;

                case 'county':
                    const countyKey = `${a.seat}|${a.county}`;
                    if (!organizedResults.county[countyKey]) {
                        organizedResults.county[countyKey] = {
                            seat: a.seat,
                            seatDisplay: config.displayName,
                            county: a.county,
                            candidates: []
                        };
                    }
                    organizedResults.county[countyKey].candidates.push(resultItem);
                    break;

                case 'constituency':
                    const constituencyKey = `${a.seat}|${a.county}|${a.constituency}`;
                    if (!organizedResults.constituency[constituencyKey]) {
                        organizedResults.constituency[constituencyKey] = {
                            seat: a.seat,
                            seatDisplay: config.displayName,
                            county: a.county,
                            constituency: a.constituency,
                            candidates: []
                        };
                    }
                    organizedResults.constituency[constituencyKey].candidates.push(resultItem);
                    break;

                case 'ward':
                    const wardKey = `${a.seat}|${a.county}|${a.constituency}|${a.ward}`;
                    if (!organizedResults.ward[wardKey]) {
                        organizedResults.ward[wardKey] = {
                            seat: a.seat,
                            seatDisplay: config.displayName,
                            county: a.county,
                            constituency: a.constituency,
                            ward: a.ward,
                            candidates: []
                        };
                    }
                    organizedResults.ward[wardKey].candidates.push(resultItem);
                    break;
            }
        });

        // Create new PDF document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Set document properties
        doc.setProperties({
            title: 'Election Results Report',
            subject: 'Official Election Results',
            author: 'Independent Electoral Commission',
            keywords: 'election, results, voting, kenya'
        });

        // Add official header
        doc.setFillColor(0, 128, 0); // Green
        doc.rect(0, 0, doc.internal.pageSize.width, 12, 'F');
        doc.setFillColor(0, 0, 0); // Black
        doc.rect(0, 12, doc.internal.pageSize.width, 2, 'F');
        doc.setFillColor(255, 0, 0); // Red
        doc.rect(0, 14, doc.internal.pageSize.width, 2, 'F');

        // Add main header
        doc.setFontSize(22);
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('INDEPENDENT ELECTORAL COMMISSION', doc.internal.pageSize.width / 2, 32, { align: 'center' });

        doc.setFontSize(18);
        doc.setTextColor(0, 128, 0);
        doc.text('OFFICIAL ELECTION RESULTS', doc.internal.pageSize.width / 2, 42, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(75, 85, 99);
        doc.text('Kenya General Election', doc.internal.pageSize.width / 2, 50, { align: 'center' });

        // Generation info box
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(20, 60, doc.internal.pageSize.width - 40, 20, 2, 2, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('Report Generated:', 25, 72);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }), 55, 72);

        // Overall statistics
        const totalOverallVotes = processedData.reduce((sum, a) => sum + a.voteCount, 0);
        const totalCandidates = processedData.length;
        
        // Calculate geographic coverage
        const counties = new Set(processedData.map(a => a.county).filter(c => c && c !== 'N/A')).size;
        const constituencies = new Set(processedData.map(a => a.constituency).filter(c => c && c !== 'N/A')).size;
        const wards = new Set(processedData.map(a => a.ward).filter(w => w && w !== 'N/A')).size;

        // Stats cards
        const cardWidth = (doc.internal.pageSize.width - 100) / 5;
        
        const stats = [
            { label: 'TOTAL VOTES', value: totalOverallVotes.toLocaleString(), color: [239, 246, 255], textColor: [29, 78, 216] },
            { label: 'COUNTIES', value: counties.toString(), color: [236, 253, 245], textColor: [4, 120, 87] },
            { label: 'CONSTITUENCIES', value: constituencies.toString(), color: [254, 242, 242], textColor: [185, 28, 28] },
            { label: 'WARDS', value: wards.toString(), color: [255, 247, 237], textColor: [194, 65, 12] },
            { label: 'CANDIDATES', value: totalCandidates.toString(), color: [243, 232, 255], textColor: [109, 40, 217] }
        ];

        stats.forEach((stat, index) => {
            const x = 20 + (index * (cardWidth + 10));
            doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
            doc.roundedRect(x, 90, cardWidth, 25, 2, 2, 'F');
            
            doc.setFontSize(8);
            doc.setTextColor(stat.textColor[0], stat.textColor[1], stat.textColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(stat.label, x + (cardWidth / 2), 100, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setTextColor(31, 41, 55);
            doc.text(stat.value, x + (cardWidth / 2), 112, { align: 'center' });
        });

        // SUMMARY HEADER
        doc.setFontSize(16);
        doc.setTextColor(0, 128, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('SUMMARY OF RESULTS BY POSITION', doc.internal.pageSize.width / 2, 135, { align: 'center' });

        // Prepare summary data with proper geographic hierarchy
        const summaryData = [];

        // National seats (President)
        Object.keys(organizedResults.national).forEach(seat => {
            const candidates = organizedResults.national[seat];
            const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
            const sorted = candidates.sort((a, b) => b.votes - a.votes);
            const winner = sorted[0];
            
            summaryData.push({
                type: 'national',
                seat: seat,
                region: 'KENYA',
                county: '-',
                constituency: '-',
                ward: '-',
                totalVotes,
                candidates: candidates.length,
                winnerName: winner.candidate,
                winnerParty: winner.party,
                winnerVotes: winner.votes,
                winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
            });
        });

        // County seats (Governor, Senator, Woman Rep)
        Object.keys(organizedResults.county).forEach(key => {
            const data = organizedResults.county[key];
            const totalVotes = data.candidates.reduce((sum, c) => sum + c.votes, 0);
            const sorted = data.candidates.sort((a, b) => b.votes - a.votes);
            const winner = sorted[0];
            
            summaryData.push({
                type: 'county',
                seat: data.seatDisplay,
                region: data.county,
                county: data.county,
                constituency: '-',
                ward: '-',
                totalVotes,
                candidates: data.candidates.length,
                winnerName: winner.candidate,
                winnerParty: winner.party,
                winnerVotes: winner.votes,
                winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
            });
        });

        // Constituency seats (MP)
        Object.keys(organizedResults.constituency).forEach(key => {
            const data = organizedResults.constituency[key];
            const totalVotes = data.candidates.reduce((sum, c) => sum + c.votes, 0);
            const sorted = data.candidates.sort((a, b) => b.votes - a.votes);
            const winner = sorted[0];
            
            summaryData.push({
                type: 'constituency',
                seat: 'MP',
                region: data.constituency,
                county: data.county,
                constituency: data.constituency,
                ward: '-',
                totalVotes,
                candidates: data.candidates.length,
                winnerName: winner.candidate,
                winnerParty: winner.party,
                winnerVotes: winner.votes,
                winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
            });
        });

        // Ward seats (MCA)
        Object.keys(organizedResults.ward).forEach(key => {
            const data = organizedResults.ward[key];
            const totalVotes = data.candidates.reduce((sum, c) => sum + c.votes, 0);
            const sorted = data.candidates.sort((a, b) => b.votes - a.votes);
            const winner = sorted[0];
            
            summaryData.push({
                type: 'ward',
                seat: 'MCA',
                region: data.ward,
                county: data.county,
                constituency: data.constituency,
                ward: data.ward,
                totalVotes,
                candidates: data.candidates.length,
                winnerName: winner.candidate,
                winnerParty: winner.party,
                winnerVotes: winner.votes,
                winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
            });
        });

        // Sort summary data by type and region
        const typeOrder = { national: 1, county: 2, constituency: 3, ward: 4 };
        summaryData.sort((a, b) => {
            if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type];
            return a.region.localeCompare(b.region);
        });

        // Create summary table with proper geographic columns
        autoTable(doc, {
            startY: 145,
            head: [['Position', 'County', 'Constituency', 'Ward', 'Winner', 'Party', 'Votes', '%']],
            body: summaryData.map(s => [
                s.seat,
                s.county,
                s.constituency,
                s.ward,
                s.winnerName.length > 20 ? s.winnerName.substring(0, 18) + '...' : s.winnerName,
                s.winnerParty,
                s.winnerVotes.toLocaleString(),
                s.winnerPercentage + '%'
            ]),
            margin: { left: 10, right: 10 },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineColor: [229, 231, 235],
                lineWidth: 0.5,
                textColor: [31, 41, 55]
            },
            headStyles: {
                fillColor: [0, 128, 0],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0
            },
            columnStyles: {
                0: { cellWidth: 25, fontStyle: 'bold' },
                1: { cellWidth: 25 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 40 },
                5: { cellWidth: 20 },
                6: { halign: 'right', cellWidth: 15 },
                7: { halign: 'right', cellWidth: 12 }
            },
            didDrawPage: (data) => {
                // Add section headers
                let currentType = '';
                data.table.body.forEach((row, index) => {
                    const rowData = summaryData[index];
                    if (rowData && rowData.type !== currentType) {
                        currentType = rowData.type;
                        // You could add section headers here if needed
                    }
                });
            }
        });

        // Add footer for first page
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setDrawColor(0, 128, 0);
        doc.line(20, doc.internal.pageSize.height - 20, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 20);
        
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('Independent Electoral Commission - Official Results', 20, doc.internal.pageSize.height - 10);
        doc.text(`Page 1 of ?`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });

        // DETAILED RESULTS PAGES
        let pageNumber = 2;

        // National results (President)
        Object.keys(organizedResults.national).forEach(seat => {
            doc.addPage();
            pageNumber = addDetailedPage(doc, {
                title: seat,
                subtitle: 'REPUBLIC OF KENYA',
                candidates: organizedResults.national[seat],
                pageNumber,
                hierarchy: ['county']
            });
        });

        // County results (Governor, Senator, Woman Rep)
        Object.keys(organizedResults.county).forEach(key => {
            const data = organizedResults.county[key];
            doc.addPage();
            pageNumber = addDetailedPage(doc, {
                title: `${data.seatDisplay} - ${data.county} COUNTY`,
                subtitle: data.county,
                candidates: data.candidates,
                pageNumber,
                hierarchy: ['constituency']
            });
        });

        // Constituency results (MP)
        Object.keys(organizedResults.constituency).forEach(key => {
            const data = organizedResults.constituency[key];
            doc.addPage();
            pageNumber = addDetailedPage(doc, {
                title: `MEMBER OF PARLIAMENT`,
                subtitle: `${data.constituency} CONSTITUENCY, ${data.county} COUNTY`,
                candidates: data.candidates,
                pageNumber,
                hierarchy: ['ward']
            });
        });

        // Ward results (MCA)
        Object.keys(organizedResults.ward).forEach(key => {
            const data = organizedResults.ward[key];
            doc.addPage();
            pageNumber = addDetailedPage(doc, {
                title: `MEMBER OF COUNTY ASSEMBLY`,
                subtitle: `${data.ward} WARD, ${data.constituency} CONSTITUENCY, ${data.county} COUNTY`,
                candidates: data.candidates,
                pageNumber,
                hierarchy: []
            });
        });

        // Save the PDF
        doc.save(`Election_Results_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
        console.error("Unexpected error:", err);
        alert('Failed to generate election results. Please try again.');
    }
};

// Helper function to add detailed results page
const addDetailedPage = (doc, { title, subtitle, candidates, pageNumber, hierarchy }) => {
    // Page header
    doc.setFillColor(0, 128, 0);
    doc.rect(0, 0, doc.internal.pageSize.width, 10, 'F');
    
    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    const sortedCandidates = candidates
        .map(c => ({
            ...c,
            percentage: totalVotes ? ((c.votes / totalVotes) * 100) : 0
        }))
        .sort((a, b) => b.votes - a.votes);

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0, 128, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(title, doc.internal.pageSize.width / 2, 22, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(subtitle, doc.internal.pageSize.width / 2, 32, { align: 'center' });

    // Statistics box
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(20, 40, doc.internal.pageSize.width - 40, 25, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Votes Cast: ${totalVotes.toLocaleString()}`, 30, 52);
    doc.text(`Number of Candidates: ${candidates.length}`, 100, 52);
    doc.text(`Registered Voters: N/A`, 160, 52);
    doc.text(`Voter Turnout: N/A`, 220, 52);

    // Determine columns based on hierarchy
    const columns = [
        { header: 'Rank', dataKey: 'rank', width: 15 },
        { header: 'Candidate', dataKey: 'candidate', width: 50 }
    ];

    if (hierarchy.includes('county')) {
        columns.push({ header: 'County', dataKey: 'county', width: 30 });
    }
    if (hierarchy.includes('constituency')) {
        columns.push({ header: 'Constituency', dataKey: 'constituency', width: 35 });
    }
    if (hierarchy.includes('ward')) {
        columns.push({ header: 'Ward', dataKey: 'ward', width: 30 });
    }

    columns.push(
        { header: 'Party', dataKey: 'party', width: 25 },
        { header: 'Votes', dataKey: 'votes', width: 20, align: 'right' },
        { header: 'Share', dataKey: 'share', width: 18, align: 'right' }
    );

    // Prepare table body
    const body = sortedCandidates.map((c, idx) => {
        const row = [
            idx + 1,
            c.candidate
        ];

        if (hierarchy.includes('county')) row.push(c.county);
        if (hierarchy.includes('constituency')) row.push(c.constituency);
        if (hierarchy.includes('ward')) row.push(c.ward);

        row.push(
            c.party,
            c.votes.toLocaleString(),
            c.percentage.toFixed(2) + '%'
        );

        return row;
    });

    // Create table
    autoTable(doc, {
        startY: 75,
        head: [columns.map(col => col.header)],
        body: body,
        margin: { left: 15, right: 15 },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [229, 231, 235],
            lineWidth: 0.5
        },
        headStyles: {
            fillColor: [0, 128, 0],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: columns.reduce((styles, col, index) => {
            styles[index] = {
                cellWidth: col.width,
                halign: col.align || 'left'
            };
            return styles;
        }, {}),
        didParseCell: (data) => {
            // Highlight winner row
            if (data.section === 'body' && data.row.index === 0) {
                data.cell.styles.fillColor = [255, 247, 237];
                data.cell.styles.fontStyle = 'bold';
            }
            // Add zebra striping
            if (data.section === 'body' && data.row.index % 2 === 1) {
                data.cell.styles.fillColor = [249, 250, 251];
            }
        }
    });

    // Add election statistics
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text('Election Statistics:', 20, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`• Winning Margin: ${(sortedCandidates[0].votes - (sortedCandidates[1]?.votes || 0)).toLocaleString()} votes`, 25, finalY + 6);
    doc.text(`• Winner's Percentage: ${sortedCandidates[0].percentage.toFixed(2)}%`, 25, finalY + 12);
    
    if (sortedCandidates.length > 1) {
        const runnerUp = sortedCandidates[1];
        doc.text(`• Runner-up: ${runnerUp.candidate} (${runnerUp.party}) - ${runnerUp.votes.toLocaleString()} votes`, 25, finalY + 18);
    }

    // Page footer
    doc.setDrawColor(0, 128, 0);
    doc.line(20, doc.internal.pageSize.height - 20, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 20);
    
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Independent Electoral Commission - Official Results', 20, doc.internal.pageSize.height - 10);
    doc.text(`Page ${pageNumber} of ?`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });

    return pageNumber + 1;
};
    const handleAddAspirant = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim() || !formData.party.trim() || !formData.seat || !formData.county) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            const { error: insertError } = await supabase
                .from('aspirants')
                .insert([{
                    name: formData.name.trim(),
                    party: formData.party.trim(),
                    seat: formData.seat,
                    county: formData.county,
                    constituency: formData.constituency.trim() || null,
                    ward: formData.ward.trim() || null,
                    created_at: new Date().toISOString()
                }]);

            if (insertError) throw insertError;

            setSuccess('Candidate added successfully!');
            setShowAddModal(false);
            setFormData({
                name: '',
                party: '',
                seat: 'MP',
                county: '',
                constituency: '',
                ward: ''
            });
            onRefresh(); 
        } catch (error) {
            console.error('Error adding aspirant:', error);
            setError(`Failed to add candidate: ${error.message}`);
        }
    };

    const handleEditAspirant = async (e) => {
        e.preventDefault();

        if (!editingAspirant) return;

        setError(null);

        if (!formData.name.trim() || !formData.party.trim() || !formData.seat || !formData.county) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            const { error: updateError } = await supabase
                .from('aspirants')
                .update({
                    name: formData.name.trim(),
                    party: formData.party.trim(),
                    seat: formData.seat,
                    county: formData.county,
                    constituency: formData.constituency.trim() || null,
                    ward: formData.ward.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingAspirant.id);

            if (updateError) throw updateError;

            setSuccess('Candidate updated successfully!');
            setShowEditModal(false);
            setEditingAspirant(null);
            setFormData({
                name: '',
                party: '',
                seat: 'MP',
                county: '',
                constituency: '',
                ward: ''
            });
            onRefresh(); // Use parent's refresh
        } catch (error) {
            console.error('Error updating aspirant:', error);
            setError(`Failed to update candidate: ${error.message}`);
        }
    };

    const handleDeleteAspirant = async (id) => {
        if (!window.confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('aspirants')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccess('Candidate deleted successfully!');
            onRefresh(); // Use parent's refresh
        } catch (error) {
            console.error('Error deleting aspirant:', error);
            setError('Failed to delete candidate. Please try again.');
        }
    };

    const fetchVoterDetails = async (aspirantId) => {
        try {
            setLoadingVoters(true);

            const { data: votesData, error: votesError } = await supabase
                .from('user_votes')
                .select('user_id, voted_at')
                .eq('aspirant_id', aspirantId)
                .order('voted_at', { ascending: false });

            if (votesError) throw votesError;

            if (!votesData || votesData.length === 0) {
                setVoterDetails([]);
                return;
            }

            const userIds = votesData.map(vote => vote.user_id);

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            const combinedData = votesData.map(vote => {
                const profile = profilesData?.find(p => p.id === vote.user_id);
                return {
                    userId: vote.user_id,
                    votedAt: vote.voted_at,
                    profile: profile || null
                };
            });

            setVoterDetails(combinedData);
        } catch (error) {
            console.error('Error fetching voter details:', error);
            setError('Failed to load voter details');
        } finally {
            setLoadingVoters(false);
        }
    };

    const handleRowClick = async (aspirant) => {
        setSelectedAspirant(aspirant);
        setShowVoterModal(true);
        setVoterSearchTerm('');
        await fetchVoterDetails(aspirant.id);
    };

    const filteredAspirants = aspirants.filter(aspirant => {
        const matchesSearch = searchTerm === '' ||
            aspirant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aspirant.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
            aspirant.county.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSeat = filterSeat === 'all' || aspirant.seat === filterSeat;

        return matchesSearch && matchesSeat;
    });

    const filteredVoterDetails = voterDetails.filter(voter => {
        if (!voter.profile) return false;

        const searchLower = voterSearchTerm.toLowerCase();
        return (
            voter.profile.full_name?.toLowerCase().includes(searchLower) ||
            voter.profile.id_number?.toLowerCase().includes(searchLower) ||
            voter.profile.phone_number?.toLowerCase().includes(searchLower) ||
            voter.profile.email?.toLowerCase().includes(searchLower) ||
            voter.profile.county?.toLowerCase().includes(searchLower) ||
            voter.profile.constituency?.toLowerCase().includes(searchLower) ||
            voter.profile.ward?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="flex-1 flex flex-col min-h-0">

            <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{error}</p>
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
                        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{success}</p>
                            </div>
                            <button
                                onClick={() => setSuccess(null)}
                                className="p-1 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Total Votes</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalVotes.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Total Voters</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalVoters.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Total Candidates</p>
                            <p className="text-2xl font-black text-slate-900">{stats.totalAspirants.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p className="text-slate-500 text-sm font-medium">Pending Registrations</p>
                            <p className="text-2xl font-black text-slate-900">{stats.pendingRegistrations.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search candidates..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <select
                                value={filterSeat}
                                onChange={(e) => setFilterSeat(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="all">All Positions</option>
                                {seats.map(seat => (
                                    <option key={seat} value={seat}>{seat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                                disabled={loading}
                            >
                                <PlusCircle size={18} />
                                Add Candidate
                            </button>
                            <button
                                onClick={handleResetVotes}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-600/20"
                                disabled={loading}
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                Reset Votes
                            </button>

                            <button
                                onClick={handlePrintElectionResults}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-600/20"
                                disabled={false}
                            >
                                <Printer size={18} className={loading ? 'animate-spin' : ''} />
                                Print Results
                            </button>


                        </div>
                    </div>


                    <div className="flex-1 min-h-0">
                        {loading && aspirants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                                <p className="font-bold uppercase tracking-widest text-xs">Loading candidates...</p>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0">
                                <div className="rounded-2xl bg-white border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
                                    <div className="overflow-hidden flex-1 min-h-0">
                                        <div className="overflow-auto h-full">
                                            <table className="w-full">
                                                <thead className="bg-linear-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Candidate</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Party</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Position</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Votes</th>
                                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {filteredAspirants.map(aspirant => {
                                                        const voteCount = votes[aspirant.id] ?? 0;
                                                        const maxVotes = Object.values(votes).length > 0 ? Math.max(...Object.values(votes)) : 1;
                                                        const percentage = (voteCount / maxVotes) * 100;

                                                        return (
                                                            <tr
                                                                key={aspirant.id}
                                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                                onClick={() => handleRowClick(aspirant)}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 font-bold">
                                                                            {aspirant.name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-gray-900">{aspirant.name}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                                                                        {aspirant.party}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="font-medium text-gray-900">{aspirant.seat}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-1 text-sm">
                                                                            <MapPin size={12} />
                                                                            <span>{aspirant.county}</span>
                                                                        </div>
                                                                        {aspirant.constituency && (
                                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                                <Home size={12} />
                                                                                <span>{aspirant.constituency}</span>
                                                                            </div>
                                                                        )}
                                                                        {aspirant.ward && (
                                                                            <div className="text-xs text-gray-400 pl-3">
                                                                                {aspirant.ward} Ward
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="space-y-1">
                                                                        <p className="text-lg font-bold text-gray-900">
                                                                            {voteCount.toLocaleString()} votes
                                                                        </p>
                                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                                            <div
                                                                                className="bg-linear-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000"
                                                                                style={{ width: `${Math.min(100, percentage)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingAspirant(aspirant);
                                                                                setFormData({
                                                                                    name: aspirant.name,
                                                                                    party: aspirant.party,
                                                                                    seat: aspirant.seat,
                                                                                    county: aspirant.county,
                                                                                    constituency: aspirant.constituency || '',
                                                                                    ward: aspirant.ward || ''
                                                                                });
                                                                                setShowEditModal(true);
                                                                            }}
                                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                            title="Edit"
                                                                            disabled={loading}
                                                                        >
                                                                            <Edit2 size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteAspirant(aspirant.id)}
                                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="Delete"
                                                                            disabled={loading}
                                                                        >
                                                                            <Trash2 size={18} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {filteredAspirants.length === 0 && !loading && (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500 font-medium">No candidates found matching your criteria.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Voter Details Modal */}
            {showVoterModal && selectedAspirant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Voters for {selectedAspirant.name}
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">
                                    {selectedAspirant.party} • {selectedAspirant.seat} • {selectedAspirant.county}
                                </p>
                                <p className="text-blue-600 font-bold text-sm mt-1">
                                    Total Votes: {(votes[selectedAspirant.id] || 0).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowVoterModal(false);
                                    setSelectedAspirant(null);
                                    setVoterDetails([]);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>


                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search voters by name, ID, phone, or location..."
                                    value={voterSearchTerm}
                                    onChange={(e) => setVoterSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Voter list with scrolling */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingVoters ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                                    <p className="font-bold uppercase tracking-widest text-xs text-gray-500">
                                        Loading voter details...
                                    </p>
                                </div>
                            ) : filteredVoterDetails.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <User size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 font-medium">
                                        {voterSearchTerm
                                            ? 'No voters found matching your search'
                                            : 'No votes recorded for this candidate yet'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredVoterDetails.map((voter, index) => (
                                        <div
                                            key={`${voter.userId}-${voter.votedAt}`}
                                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                                        >
                                            {voter.profile ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="h-12 w-12 rounded-full bg-linear-to-br from-green-100 to-emerald-100 flex items-center justify-center text-green-600 font-bold text-lg shrink-0">
                                                            {voter.profile.full_name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-900">
                                                                {voter.profile.full_name || 'Unnamed Voter'}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                                <Hash size={12} />
                                                                <span>ID: {voter.profile.id_number || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Mail size={14} className="text-gray-400" />
                                                            <span className="text-gray-600 truncate">
                                                                {voter.profile.email || 'No email'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Phone size={14} className="text-gray-400" />
                                                            <span className="text-gray-600">
                                                                {voter.profile.phone_number || 'No phone'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <MapPin size={14} className="text-gray-400" />
                                                            <span className="text-gray-600">
                                                                {voter.profile.county}, {voter.profile.constituency}
                                                            </span>
                                                        </div>

                                                        {voter.profile.ward && (
                                                            <div className="text-xs text-gray-500 pl-6">
                                                                {voter.profile.ward} Ward
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="pt-2 border-t border-gray-100">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Voted on: {new Date(voter.votedAt).toLocaleDateString()} at {new Date(voter.votedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg shrink-0">
                                                            ?
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">Anonymous Voter</h4>
                                                            <p className="text-sm text-gray-500">User ID: {voter.userId.substring(0, 8)}...</p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-gray-100">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <Calendar size={12} />
                                                            <span>
                                                                Voted on: {new Date(voter.votedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500">
                                Showing {filteredVoterDetails.length} of {voterDetails.length} voters
                                {voterSearchTerm && ' matching search'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Candidate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                            <h3 className="text-xl font-bold text-gray-900">Add New Candidate</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddAspirant} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Political Party *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.party}
                                        onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Party Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Position *</label>
                                    <select
                                        required
                                        value={formData.seat}
                                        onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        {seats.map(seat => (
                                            <option key={seat} value={seat}>{seat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">County *</label>
                                    <select
                                        required
                                        value={formData.county}
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select County</option>
                                        {counties.map(county => (
                                            <option key={county} value={county}>{county}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Constituency (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.constituency}
                                        onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Constituency Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ward (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Ward Name"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
                                    {loading ? 'Adding...' : 'Add Candidate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Candidate Modal */}
            {showEditModal && editingAspirant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                            <h3 className="text-xl font-bold text-gray-900">Edit Candidate</h3>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingAspirant(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleEditAspirant} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Political Party *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.party}
                                        onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Position *</label>
                                    <select
                                        required
                                        value={formData.seat}
                                        onChange={(e) => setFormData({ ...formData, seat: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        {seats.map(seat => (
                                            <option key={seat} value={seat}>{seat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">County *</label>
                                    <select
                                        required
                                        value={formData.county}
                                        onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="">Select County</option>
                                        {counties.map(county => (
                                            <option key={county} value={county}>{county}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Constituency (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.constituency}
                                        onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Ward (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.ward}
                                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingAspirant(null);
                                    }}
                                    className="px-6 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Edit2 size={18} />}
                                    {loading ? 'Updating...' : 'Update Candidate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AspirantPanel;