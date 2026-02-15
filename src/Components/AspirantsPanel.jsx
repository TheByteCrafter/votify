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

            // Comprehensive seat configuration for ALL positions
            const seatConfig = {
                // NATIONAL SEATS (1 result total)
                'President': {
                    type: 'national',
                    level: 'country',
                    displayName: 'PRESIDENT',
                    hierarchy: ['country'],
                    geographicColumns: []
                },

                // COUNTY SEATS (47 results - one per county)
                'Governor': {
                    type: 'county',
                    level: 'county',
                    displayName: 'GOVERNOR',
                    hierarchy: ['county'],
                    geographicColumns: ['county']
                },
                'Senator': {
                    type: 'county',
                    level: 'county',
                    displayName: 'SENATOR',
                    hierarchy: ['county'],
                    geographicColumns: ['county']
                },
                'Woman Representative': {
                    type: 'county',
                    level: 'county',
                    displayName: 'WOMAN REPRESENTATIVE',
                    hierarchy: ['county'],
                    geographicColumns: ['county']
                },

                // CONSTITUENCY SEATS (290 results - one per constituency)
                'Member of Parliament': {
                    type: 'constituency',
                    level: 'constituency',
                    displayName: 'MEMBER OF PARLIAMENT',
                    hierarchy: ['county', 'constituency'],
                    geographicColumns: ['county', 'constituency']
                },
                'MP': { // Alternative name
                    type: 'constituency',
                    level: 'constituency',
                    displayName: 'MEMBER OF PARLIAMENT',
                    hierarchy: ['county', 'constituency'],
                    geographicColumns: ['county', 'constituency']
                },

                // WARD SEATS (1450 results - one per ward)
                'Member of County Assembly': {
                    type: 'ward',
                    level: 'ward',
                    displayName: 'MEMBER OF COUNTY ASSEMBLY',
                    hierarchy: ['county', 'constituency', 'ward'],
                    geographicColumns: ['county', 'constituency', 'ward']
                },
                'MCA': { // Alternative name
                    type: 'ward',
                    level: 'ward',
                    displayName: 'MEMBER OF COUNTY ASSEMBLY',
                    hierarchy: ['county', 'constituency', 'ward'],
                    geographicColumns: ['county', 'constituency', 'ward']
                },

                // SPECIAL SEATS (if applicable)
                'County Woman Representative': {
                    type: 'county',
                    level: 'county',
                    displayName: 'COUNTY WOMAN REPRESENTATIVE',
                    hierarchy: ['county'],
                    geographicColumns: ['county']
                }
            };

            // Organize results by seat type
            const organizedResults = {
                national: [],      // President
                county: [],        // Governor, Senator, Woman Rep
                constituency: [],  // MP
                ward: []          // MCA
            };

            // Process each aspirant
            processedData.forEach(a => {
                const config = seatConfig[a.seat];
                if (!config) {
                    console.warn(`Unknown seat type: ${a.seat}`);
                    return;
                }

                const resultItem = {
                    id: a.id,
                    candidate: a.name,
                    party: a.party,
                    seat: a.seat,
                    seatDisplay: config.displayName,
                    seatType: config.type,
                    votes: a.voteCount,
                    county: a.county || 'N/A',
                    constituency: a.constituency || 'N/A',
                    ward: a.ward || 'N/A',
                    hierarchy: config.hierarchy
                };

                // Create unique key based on geographic level
                let key;
                switch (config.type) {
                    case 'national':
                        key = 'national';
                        break;
                    case 'county':
                        key = `${a.seat}|${a.county}`;
                        break;
                    case 'constituency':
                        key = `${a.seat}|${a.county}|${a.constituency}`;
                        break;
                    case 'ward':
                        key = `${a.seat}|${a.county}|${a.constituency}|${a.ward}`;
                        break;
                    default:
                        key = 'other';
                }

                // Initialize if not exists
                if (!organizedResults[config.type].find(r => r.key === key)) {
                    organizedResults[config.type].push({
                        key,
                        seat: a.seat,
                        seatDisplay: config.displayName,
                        seatType: config.type,
                        county: a.county,
                        constituency: a.constituency,
                        ward: a.ward,
                        candidates: []
                    });
                }

                // Add candidate to the appropriate group
                const group = organizedResults[config.type].find(r => r.key === key);
                if (group) {
                    group.candidates.push(resultItem);
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

            // Calculate comprehensive statistics
            const totalOverallVotes = processedData.reduce((sum, a) => sum + a.voteCount, 0);
            const totalCandidates = processedData.length;

            // Calculate geographic coverage
            const counties = new Set(processedData.map(a => a.county).filter(c => c && c !== 'N/A')).size;
            const constituencies = new Set(processedData.map(a => a.constituency).filter(c => c && c !== 'N/A')).size;
            const wards = new Set(processedData.map(a => a.ward).filter(w => w && w !== 'N/A')).size;

            // Count results by seat type
            const nationalSeatsCount = organizedResults.national.length;
            const countySeatsCount = organizedResults.county.length;
            const constituencySeatsCount = organizedResults.constituency.length;
            const wardSeatsCount = organizedResults.ward.length;

            // Stats cards
            const cardWidth = (doc.internal.pageSize.width - 120) / 6;

            const stats = [
                { label: 'TOTAL VOTES', value: totalOverallVotes.toLocaleString(), color: [239, 246, 255], textColor: [29, 78, 216] },
                { label: 'COUNTIES', value: counties.toString(), color: [236, 253, 245], textColor: [4, 120, 87] },
                { label: 'CONSTITUENCIES', value: constituencies.toString(), color: [254, 242, 242], textColor: [185, 28, 28] },
                { label: 'WARDS', value: wards.toString(), color: [255, 247, 237], textColor: [194, 65, 12] },
                { label: 'CANDIDATES', value: totalCandidates.toString(), color: [243, 232, 255], textColor: [109, 40, 217] },
                { label: 'SEATS', value: (nationalSeatsCount + countySeatsCount + constituencySeatsCount + wardSeatsCount).toString(), color: [254, 249, 195], textColor: [146, 64, 14] }
            ];

            stats.forEach((stat, index) => {
                const x = 15 + (index * (cardWidth + 5));
                doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
                doc.roundedRect(x, 90, cardWidth, 25, 2, 2, 'F');

                doc.setFontSize(7);
                doc.setTextColor(stat.textColor[0], stat.textColor[1], stat.textColor[2]);
                doc.setFont('helvetica', 'bold');
                doc.text(stat.label, x + (cardWidth / 2), 100, { align: 'center' });

                doc.setFontSize(10);
                doc.setTextColor(31, 41, 55);
                doc.text(stat.value, x + (cardWidth / 2), 112, { align: 'center' });
            });

            // SUMMARY SECTION
            doc.setFontSize(16);
            doc.setTextColor(0, 128, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('SUMMARY OF RESULTS', doc.internal.pageSize.width / 2, 135, { align: 'center' });

            // Prepare summary data for ALL seats
            const allSummaries = [];

            // National seats (President)
            organizedResults.national.forEach(group => {
                group.candidates.sort((a, b) => b.votes - a.votes);
                const totalVotes = group.candidates.reduce((sum, c) => sum + c.votes, 0);
                const winner = group.candidates[0];

                allSummaries.push({
                    type: 'NATIONAL',
                    seat: group.seatDisplay,
                    region: 'KENYA',
                    county: '-',
                    constituency: '-',
                    ward: '-',
                    totalVotes,
                    candidates: group.candidates.length,
                    winnerName: winner.candidate,
                    winnerParty: winner.party,
                    winnerVotes: winner.votes,
                    winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
                });
            });

            // County seats (Governor, Senator, Woman Rep)
            organizedResults.county.forEach(group => {
                group.candidates.sort((a, b) => b.votes - a.votes);
                const totalVotes = group.candidates.reduce((sum, c) => sum + c.votes, 0);
                const winner = group.candidates[0];

                allSummaries.push({
                    type: 'COUNTY',
                    seat: group.seatDisplay,
                    region: group.county,
                    county: group.county,
                    constituency: '-',
                    ward: '-',
                    totalVotes,
                    candidates: group.candidates.length,
                    winnerName: winner.candidate,
                    winnerParty: winner.party,
                    winnerVotes: winner.votes,
                    winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
                });
            });

            // Constituency seats (MP)
            organizedResults.constituency.forEach(group => {
                group.candidates.sort((a, b) => b.votes - a.votes);
                const totalVotes = group.candidates.reduce((sum, c) => sum + c.votes, 0);
                const winner = group.candidates[0];

                allSummaries.push({
                    type: 'CONSTITUENCY',
                    seat: group.seatDisplay,
                    region: group.constituency,
                    county: group.county,
                    constituency: group.constituency,
                    ward: '-',
                    totalVotes,
                    candidates: group.candidates.length,
                    winnerName: winner.candidate,
                    winnerParty: winner.party,
                    winnerVotes: winner.votes,
                    winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
                });
            });

            // Ward seats (MCA)
            organizedResults.ward.forEach(group => {
                group.candidates.sort((a, b) => b.votes - a.votes);
                const totalVotes = group.candidates.reduce((sum, c) => sum + c.votes, 0);
                const winner = group.candidates[0];

                allSummaries.push({
                    type: 'WARD',
                    seat: group.seatDisplay,
                    region: group.ward,
                    county: group.county,
                    constituency: group.constituency,
                    ward: group.ward,
                    totalVotes,
                    candidates: group.candidates.length,
                    winnerName: winner.candidate,
                    winnerParty: winner.party,
                    winnerVotes: winner.votes,
                    winnerPercentage: totalVotes ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0
                });
            });

            // Sort summaries by type and region
            const typeOrder = { NATIONAL: 1, COUNTY: 2, CONSTITUENCY: 3, WARD: 4 };
            allSummaries.sort((a, b) => {
                if (a.type !== b.type) return typeOrder[a.type] - typeOrder[b.type];
                return a.region.localeCompare(b.region);
            });

            // Create summary table with ALL geographic columns
            autoTable(doc, {
                startY: 145,
                head: [['Type', 'Position', 'County', 'Constituency', 'Ward', 'Winner', 'Party', 'Votes', '%']],
                body: allSummaries.map(s => [
                    s.type,
                    s.seat,
                    s.county,
                    s.constituency,
                    s.ward,
                    s.winnerName.length > 18 ? s.winnerName.substring(0, 16) + '...' : s.winnerName,
                    s.winnerParty,
                    s.winnerVotes.toLocaleString(),
                    s.winnerPercentage + '%'
                ]),
                margin: { left: 10, right: 10 },
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                    lineColor: [229, 231, 235],
                    lineWidth: 0.5,
                    textColor: [31, 41, 55]
                },
                headStyles: {
                    fillColor: [0, 128, 0],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center',
                    lineWidth: 0
                },
                columnStyles: {
                    0: { cellWidth: 18, fontStyle: 'bold' },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 18 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 18 },
                    5: { cellWidth: 32 },
                    6: { cellWidth: 15 },
                    7: { halign: 'right', cellWidth: 12 },
                    8: { halign: 'right', cellWidth: 10 }
                },
                didDrawPage: (data) => {
                    // Add section headers
                    let lastType = '';
                    data.table.body.forEach((row, index) => {
                        const rowData = allSummaries[index];
                        if (rowData && rowData.type !== lastType) {
                            lastType = rowData.type;
                            // Visual separator could be added here
                        }
                    });
                }
            });

            // Add footer for first page
            doc.setDrawColor(0, 128, 0);
            doc.line(20, doc.internal.pageSize.height - 20, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 20);

            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text('Independent Electoral Commission - Official Results', 20, doc.internal.pageSize.height - 10);
            doc.text(`Page 1 of ?`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });

            // DETAILED RESULTS PAGES
            let pageNumber = 2;

            // Helper function to add detailed page
            const addDetailedPage = (title, subtitle, candidates, hierarchy) => {
                doc.addPage();

                // Page header
                doc.setFillColor(0, 128, 0);
                doc.rect(0, 0, doc.internal.pageSize.width, 10, 'F');

                const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
                const sortedCandidates = [...candidates]
                    .map(c => ({
                        ...c,
                        percentage: totalVotes ? ((c.votes / totalVotes) * 100) : 0
                    }))
                    .sort((a, b) => b.votes - a.votes);

                // Title
                doc.setFontSize(16);
                doc.setTextColor(0, 128, 0);
                doc.setFont('helvetica', 'bold');
                doc.text(title, doc.internal.pageSize.width / 2, 22, { align: 'center' });

                doc.setFontSize(12);
                doc.setTextColor(31, 41, 55);
                doc.text(subtitle, doc.internal.pageSize.width / 2, 32, { align: 'center' });

                // Statistics box
                doc.setFillColor(239, 246, 255);
                doc.roundedRect(20, 38, doc.internal.pageSize.width - 40, 20, 2, 2, 'F');

                doc.setFontSize(9);
                doc.setTextColor(31, 41, 55);
                doc.setFont('helvetica', 'normal');
                doc.text(`Total Votes: ${totalVotes.toLocaleString()}`, 30, 50);
                doc.text(`Candidates: ${candidates.length}`, 100, 50);
                doc.text(`Winner: ${sortedCandidates[0].candidate} (${sortedCandidates[0].party})`, 150, 50);

                // Build columns based on hierarchy
                const columns = [
                    { header: 'Rank', dataKey: 'rank', width: 12 }
                ];

                // Add geographic columns based on what's available
                if (hierarchy.includes('county')) {
                    columns.push({ header: 'County', dataKey: 'county', width: 25 });
                }
                if (hierarchy.includes('constituency')) {
                    columns.push({ header: 'Constituency', dataKey: 'constituency', width: 30 });
                }
                if (hierarchy.includes('ward')) {
                    columns.push({ header: 'Ward', dataKey: 'ward', width: 25 });
                }

                columns.push(
                    { header: 'Candidate', dataKey: 'candidate', width: 45 },
                    { header: 'Party', dataKey: 'party', width: 20 },
                    { header: 'Votes', dataKey: 'votes', width: 18, align: 'right' },
                    { header: 'Share', dataKey: 'share', width: 15, align: 'right' }
                );

                // Prepare table body
                const body = sortedCandidates.map((c, idx) => {
                    const row = [idx + 1];

                    if (hierarchy.includes('county')) row.push(c.county);
                    if (hierarchy.includes('constituency')) row.push(c.constituency);
                    if (hierarchy.includes('ward')) row.push(c.ward);

                    row.push(
                        c.candidate,
                        c.party,
                        c.votes.toLocaleString(),
                        c.percentage.toFixed(2) + '%'
                    );

                    return row;
                });

                // Create table
                autoTable(doc, {
                    startY: 65,
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
                        if (data.section === 'body' && data.row.index === 0) {
                            data.cell.styles.fillColor = [255, 247, 237];
                            data.cell.styles.fontStyle = 'bold';
                        }
                        if (data.section === 'body' && data.row.index % 2 === 1) {
                            data.cell.styles.fillColor = [249, 250, 251];
                        }
                    }
                });

                // Election statistics
                const finalY = doc.lastAutoTable.finalY + 10;

                doc.setFontSize(8);
                doc.setTextColor(31, 41, 55);
                doc.setFont('helvetica', 'bold');
                doc.text('Election Statistics:', 20, finalY);

                doc.setFont('helvetica', 'normal');
                const margin = sortedCandidates[0].votes - (sortedCandidates[1]?.votes || 0);
                doc.text(`• Winning Margin: ${margin.toLocaleString()} votes`, 25, finalY + 5);
                doc.text(`• Winner's Share: ${sortedCandidates[0].percentage.toFixed(2)}%`, 25, finalY + 10);

                if (sortedCandidates.length > 1) {
                    doc.text(`• Runner-up: ${sortedCandidates[1].candidate} (${sortedCandidates[1].party})`, 25, finalY + 15);
                }

                // Page footer
                doc.setDrawColor(0, 128, 0);
                doc.line(20, doc.internal.pageSize.height - 20, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 20);

                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128);
                doc.text('Independent Electoral Commission - Official Results', 20, doc.internal.pageSize.height - 10);
                doc.text(`Page ${pageNumber} of ?`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });

                pageNumber++;
            };

            // Generate detailed pages for ALL seats

            // 1. National (President)
            organizedResults.national.forEach(group => {
                addDetailedPage(
                    `PRESIDENT OF THE REPUBLIC OF KENYA`,
                    'NATIONAL RESULTS',
                    group.candidates,
                    ['county'] // Show county of origin for president candidates
                );
            });

            // 2. County Seats (Governor, Senator, Woman Rep)
            organizedResults.county.forEach(group => {
                addDetailedPage(
                    group.seatDisplay,
                    `${group.county} COUNTY`,
                    group.candidates,
                    ['constituency'] // Show constituency breakdown for county seats
                );
            });

            // 3. Constituency Seats (MP)
            organizedResults.constituency.forEach(group => {
                addDetailedPage(
                    `MEMBER OF PARLIAMENT`,
                    `${group.constituency} CONSTITUENCY, ${group.county} COUNTY`,
                    group.candidates,
                    ['ward'] // Show ward breakdown for MP results
                );
            });

            // 4. Ward Seats (MCA)
            organizedResults.ward.forEach(group => {
                addDetailedPage(
                    `MEMBER OF COUNTY ASSEMBLY`,
                    `${group.ward} WARD, ${group.constituency} CONSTITUENCY, ${group.county} COUNTY`,
                    group.candidates,
                    [] // No further breakdown needed
                );
            });

            // Save the PDF
            doc.save(`Kenya_Election_Results_${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (err) {
            console.error("Unexpected error:", err);
            alert('Failed to generate election results. Please try again.');
        }
    };

    // Helper function to add detailed results page
    
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