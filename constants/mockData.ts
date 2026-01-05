export interface MarketItem {
    id: string;
    title: string;
    price: number;
    category: string;
    type: 'item' | 'food' | 'service';
    images: string[];
    ownerId: string;
    description: string;
    prepTime?: string;
    calories?: number;
    dietary?: string[];
    duration?: string;
    platform?: string;
}

export interface User {
    id: string;
    name: string;
    avatar: string;
    university: string;
    school?: string;
    comments?: any[];
    unreadMessagesCount?: number;
    walletBalance: number;
    escrowBalance: number;
}

export const USERS: User[] = [
    {
        id: 'u1',
        name: 'Michael Adebayo',
        avatar: 'https://i.pravatar.cc/150?u=u1',
        university: 'UNILAG',
        unreadMessagesCount: 3,
        walletBalance: 125400,
        escrowBalance: 25000,
    },
    {
        id: 'u2',
        name: 'Bolu Johnson',
        avatar: 'https://i.pravatar.cc/150?u=u2',
        university: 'UNIBADAN',
        walletBalance: 45000,
        escrowBalance: 0,
    },
    {
        id: 'u3',
        name: 'Sarah Okon',
        avatar: 'https://i.pravatar.cc/150?u=u3',
        university: 'Covenant University',
        walletBalance: 82000,
        escrowBalance: 0,
    },
    {
        id: 'u4',
        name: 'Hassan Musa',
        avatar: 'https://i.pravatar.cc/150?u=u4',
        university: 'ABU Zaria',
        walletBalance: 12000,
        escrowBalance: 0,
    },
];

export const POSTS = [
    {
        id: 'p1',
        userId: 'u1',
        content: 'Lagos traffic is something else today! Yet the hustle continues. Who else is grinding at the library tonight?',
        images: [
            'https://images.unsplash.com/photo-1577563820647-b371b18d8745?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?auto=format&fit=crop&w=800&q=80',
        ],
        timestamp: '10m',
        likes: 342,
        shares: 209,
        liked: true,
        school: 'UNILAG',
        comments: [
            {
                id: 'c1',
                userId: 'u2',
                content: 'The energy in Lagos is unmatched! 🇳🇬',
                timestamp: '5m',
                likes: 12,
                replies: [
                    {
                        id: 'r1',
                        userId: 'u1',
                        content: "No dull moment!",
                        timestamp: '2m',
                        likes: 2,
                    }
                ]
            },
            {
                id: 'c2',
                userId: 'u3',
                content: 'I wish Ota was this lively lol.',
                timestamp: '3m',
                likes: 5,
                replies: []
            }
        ]
    },
    {
        id: 'p2',
        userId: 'u2',
        content: 'ASUU strike update: Negotiations are ongoing. Fingers crossed we resume soon. #Education',
        images: [],
        timestamp: '4m',
        likes: 125,
        shares: 12,
        liked: false,
        school: 'UNILAG',
        comments: []
    },
    {
        id: 'p3',
        userId: 'u3',
        content: 'Hebron startup incubator just launched! Perfect for student entrepreneurs.',
        images: ['https://images.unsplash.com/photo-1541339907198-e08759dfc3ef?auto=format&fit=crop&w=800&q=80'],
        timestamp: '2h',
        likes: 862,
        shares: 12,
        liked: false,
        school: 'Covenant University',
        comments: [],
    },
    {
        id: 'p4',
        userId: 'u4',
        content: 'Anyone heading to the SUG debate tonight? The Auditorium is going to be packed!',
        images: [],
        timestamp: '1h',
        likes: 54,
        shares: 5,
        liked: false,
        school: 'ABU Zaria',
        comments: [],
    },
    {
        id: 'p5',
        userId: 'u1',
        content: 'Just finished the GST exam. That last question was a set up... anyone else?',
        images: [],
        timestamp: '30m',
        likes: 88,
        shares: 2,
        liked: false,
        school: 'UNILAG',
        comments: [],
    },
    {
        id: 'p6',
        userId: 'u2',
        content: 'Lost my ID card at the Senate building. Please if found, DM me immediately! 🙏',
        images: [],
        timestamp: '15m',
        likes: 15,
        shares: 42,
        liked: false,
        school: 'UNILAG',
        comments: [],
    },
    {
        id: 'p7',
        userId: 'u1',
        content: 'Lagoon Front at sunset is simply therapeutic. Best spot to clear your head after lectures.',
        images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'],
        timestamp: '1h',
        likes: 245,
        shares: 34,
        liked: true,
        school: 'UNILAG',
        comments: [],
    },
    {
        id: 'p8',
        userId: 'u3',
        content: 'Is CITS open on Saturdays for data correction? I need to fix my portal profile.',
        images: [],
        timestamp: '3h',
        likes: 8,
        shares: 1,
        liked: false,
        school: 'UNILAG',
        comments: [],
    },
];

export const MARKET_ITEMS: MarketItem[] = [
    {
        id: 'm1',
        title: 'MacBook Pro M2 2022',
        price: 950000,
        category: 'Electronics',
        type: 'item',
        images: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1510511459019-5dee9954889c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80',
        ],
        ownerId: 'u1',
        description: 'Slightly used UK used MacBook Pro. Battery cycle count 45. Clean deal.',
    },
    {
        id: 'm2',
        title: 'JAMB & WAEC Past Questions',
        price: 3500,
        category: 'Books',
        type: 'item',
        images: [
            'https://images.unsplash.com/photo-1532012197367-2d5970d372c5?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80',
        ],
        ownerId: 'u2',
        description: 'Complete series for Science students. Essential for 100lvl prep.',
    },
    {
        id: 'food1',
        title: 'Smoky Party Jollof & Chicken',
        price: 2500,
        category: 'African',
        type: 'food',
        prepTime: '20-30m',
        calories: 600,
        dietary: ['Halal', 'Spicy'],
        images: [
            'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=800&q=80',
        ],
        ownerId: 'u3',
        description: 'Authentic firewood Jollof rice with fried Titus fish or Chicken. Served hot in Moremi Hall.',
    },
    {
        id: 'food2',
        title: 'Suya & Masa Combo',
        price: 1500,
        category: 'Local',
        type: 'food',
        prepTime: '15m',
        calories: 550,
        dietary: ['Fresh', 'Peppery'],
        images: [
            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        ],
        ownerId: 'u1',
        description: 'Spicy beef suya with soft masa. Best night snack.',
    },
    {
        id: 'serv1',
        title: 'MTH 101 Tutoring',
        price: 3000,
        category: 'Academic',
        type: 'service',
        duration: '1h',
        platform: 'In-person / Zoom',
        images: [
            'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
        ],
        ownerId: 'u4',
        description: 'Helping students ace General Math I & II. Handouts provided.',
    },
    {
        id: 'serv2',
        title: 'Student Barber (Low Cut/Fade)',
        price: 2000,
        category: 'Grooming',
        type: 'service',
        duration: '45m',
        platform: 'New Hall',
        images: [
            'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
        ],
        ownerId: 'u1',
        description: 'Sharp cuts at student friendly prices. Home service available within campus.',
    },
    {
        id: 'm3',
        title: 'Rechargeable Fan',
        price: 15000,
        category: 'Electronics',
        type: 'item',
        images: [
            'https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&w=400&q=80',
        ],
        ownerId: 'u3',
        description: 'Strong battery life. Essential for when NEPA takes light.',
    },
    {
        id: 'm4',
        title: 'Vintage Denim Jacket',
        price: 12000,
        category: 'Fashion',
        type: 'item',
        images: [
            'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1582552938357-129653c4ca8d?auto=format&fit=crop&w=400&q=80',
        ],
        ownerId: 'u4',
        description: 'Size M, alté vibes.',
    },
    {
        id: 'm5',
        title: 'Original AirPods Pro',
        price: 180000,
        category: 'Electronics',
        type: 'item',
        images: [
            'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?auto=format&fit=crop&w=400&q=80',
            'https://images.unsplash.com/photo-1610492317734-7828a3815070?auto=format&fit=crop&w=400&q=80',
        ],
        ownerId: 'u1',
        description: 'Direct from UK. Box and accessories included.',
    },
    {
        id: 'm6',
        title: 'Reading Table & Chair',
        price: 45000,
        category: 'Furniture',
        type: 'item',
        images: [
            'https://images.unsplash.com/photo-1505797149-35ebcb05a6fd?auto=format&fit=crop&w=400&q=80',
        ],
        ownerId: 'u2',
        description: 'Sturdy wooden table and padded chair.',
    },
];

export const ACTIVE_ORDERS = [
    {
        id: '1',
        item: MARKET_ITEMS.find(i => i.type === 'food') || MARKET_ITEMS[0],
        status: 'Preparing',
        eta: '15 mins',
        type: 'food',
        escrowStatus: 'held',
        escrowAmount: 2500,
    },
    {
        id: '2',
        item: MARKET_ITEMS.find(i => i.type === 'service') || MARKET_ITEMS[1],
        status: 'In Progress',
        eta: 'Ongoing',
        type: 'service',
        escrowStatus: 'held',
        escrowAmount: 3000,
    }
];

export const HOUSES = [
    {
        id: 'h1',
        title: 'Self-Con near UNILAG Gate',
        price: 450000,
        address: 'Akoka, Yaba',
        images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
        ],
        amenities: ['Water', 'Security', 'Tiled'],
        description: 'Clean self-contain apartment, 5 mins walk to school gate. ₦450k per annum.',
        reviews: [
            {
                id: 'r1',
                userId: 'u2',
                rating: 4,
                comment: "The security here is top-notch. Never had any issues. Water runs 24/7 mostly.",
                timestamp: '2 weeks ago'
            },
            {
                id: 'r2',
                userId: 'u4',
                rating: 3,
                comment: "Good place but the landlord can be strict about visitors.",
                timestamp: '1 month ago'
            }
        ]
    },
    {
        id: 'h2',
        title: 'Shared Flat in Agbowo',
        price: 150000,
        address: 'Agbowo, Ibadan',
        images: [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1484154218962-a1c002085d2f?auto=format&fit=crop&w=800&q=80',
        ],
        amenities: ['Fenced', 'Running Water'],
        description: 'Looking for a roommate for a room and parlor. Close to UI.',
        reviews: []
    },
];

export const LIBRARY_CATEGORIES = [
    { id: 'c1', title: 'Faculty of Science', count: 124, icon: 'flask' },
    { id: 'c2', title: 'Faculty of Engineering', count: 86, icon: 'construct' },
    { id: 'c3', title: 'Faculty of Arts', count: 45, icon: 'color-palette' },
    { id: 'c4', title: 'Social Sciences', count: 67, icon: 'people' },
];

export const LIBRARY_MATERIALS = [
    {
        id: 'l1',
        title: 'CSC 101 Lecture Notes',
        courseCode: 'CSC 101',
        subject: 'Computer Science',
        type: 'PDF',
        authorId: 'u3',
        downloads: 120,
        rating: 4.5,
        size: '2.4 MB',
        date: '2d ago',
        description: 'Comprehensive notes covering Introduction to Computing, Binary Systems, and Algorithm Basics.',
        previewImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
        reviews: [
            { id: 'r1', userId: 'u2', rating: 5, comment: "Super helpful, thanks!", timestamp: '1d ago' },
            { id: 'r2', userId: 'u4', rating: 4, comment: "Good summary but missing chapter 4.", timestamp: '5h ago' }
        ]
    },
    {
        id: 'l2',
        title: 'MTH 201 Past Questions',
        courseCode: 'MTH 201',
        subject: 'Mathematics',
        type: 'DOCX',
        authorId: 'u1',
        downloads: 85,
        rating: 4.2,
        size: '1.1 MB',
        date: '1w ago',
        description: 'Solved past questions from 2018-2023. Includes step-by-step solutions for calculus problems.',
        previewImage: 'https://images.unsplash.com/photo-1509228468518-180dd482195b?auto=format&fit=crop&w=400&q=80',
        reviews: [
            { id: 'r3', userId: 'u3', rating: 4, comment: "Calculus section is life saving.", timestamp: '3d ago' }
        ]
    },
    {
        id: 'l3',
        title: 'GST 101: Use of English',
        courseCode: 'GST 101',
        subject: 'General Studies',
        type: 'PDF',
        authorId: 'u2',
        downloads: 450,
        rating: 4.8,
        size: '5.6 MB',
        date: '3d ago',
        description: 'Complete rigorous guide to English grammar and essay writing for freshmen.',
        previewImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80',
        reviews: []
    },
    {
        id: 'l4',
        title: 'Engineering Drawing Packet',
        courseCode: 'MEG 201',
        subject: 'Engineering',
        type: 'IMG',
        authorId: 'u4',
        downloads: 12,
        rating: 3.9,
        size: '12 MB',
        date: '5h ago',
        description: 'High-res scans of isometric projection assignments.',
        previewImage: 'https://images.unsplash.com/photo-1581093588401-fbb07e1dc503?auto=format&fit=crop&w=400&q=80',
        reviews: []
    },
];

export const VOTING_NEWS = [
    {
        id: 'n1',
        title: 'SUG Debate Night: Presidential Candidates Face Off',
        summary: 'The battle for the presidency heats up as candidates debated key issues on welfare and security.',
        date: '2h ago',
        image: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'n2',
        title: 'Accreditation Guidelines Released',
        summary: 'IEC releases strict guidelines for voter accreditation. Verify your matric number now.',
        date: '1d ago',
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    },
];

export const ELECTIONS = [
    {
        id: 'e1',
        title: 'SUG Elections 2026',
        description: 'Student Union Government General Elections.',
        status: 'Open',
        endsAt: '2026-02-01T18:00:00Z',
        totalVoters: 14500,
        votesCast: 8234,
        positions: [
            {
                id: 'p1',
                title: 'President',
                candidates: [
                    {
                        id: 'c1',
                        name: 'John Doe',
                        nickname: 'Aluta',
                        party: 'Action Alliance',
                        image: 'https://i.pravatar.cc/150?u=c1',
                        manifesto: 'My administration will focus on three key pillars: Security, Welfare, and Academic Stability. We will ensure 24/7 library access and reduced shuttle prices.',
                        video: 'https://example.com/video1.mp4',
                        socials: { twitter: '@john_aluta', instagram: '@john_doe' }
                    },
                    {
                        id: 'c2',
                        name: 'Jane Smith',
                        nickname: 'Mama',
                        party: 'Progressive Front',
                        image: 'https://i.pravatar.cc/150?u=c2',
                        manifesto: 'Accountability is not just a word. I promise to publish monthly financial reports. We will also renovate the female hostels within my first 100 days.',
                        video: 'https://example.com/video2.mp4',
                        socials: { twitter: '@jane_pf', instagram: '@jane_smith' }
                    },
                ]
            },
            {
                id: 'p2',
                title: 'Vice President',
                candidates: [
                    {
                        id: 'c3',
                        name: 'David Mark',
                        nickname: 'Dave',
                        party: 'Action Alliance',
                        image: 'https://i.pravatar.cc/150?u=c3',
                        manifesto: 'Support the president and ensure welfare packages reach every student.',
                        socials: { twitter: '@dave_mark' }
                    },
                    {
                        id: 'c4',
                        name: 'Sarah Connor',
                        nickname: 'Terminator',
                        party: 'Independent',
                        image: 'https://i.pravatar.cc/150?u=c4',
                        manifesto: 'I will terminate oppression and fight for student rights.',
                        socials: { instagram: '@sarah_connor' }
                    },
                ]
            }
        ]
    },
    {
        id: 'e2',
        title: 'Faculty of Science',
        description: 'Executive Council Elections.',
        status: 'Upcoming',
        endsAt: '2026-02-15T00:00:00Z',
        totalVoters: 2500,
        votesCast: 0,
        positions: []
    }
];

export const PAST_RESULTS = [
    {
        id: 'r1',
        title: 'Departmental Elections 2025',
        date: 'Nov 2025',
        winner: 'Team Excellence',
        turnout: '68%',
    }
];

export const DIRECT_MESSAGES = [
    {
        id: 'dm1',
        user: USERS[1],
        lastMessage: "Hey, is the MacBook still available? Can I pay 900k?",
        timestamp: '10m',
        unread: true,
    },
    {
        id: 'dm2',
        user: USERS[2],
        lastMessage: "Thanks for the notes!",
        timestamp: '1h',
        unread: false,
    },
    {
        id: 'dm3',
        user: USERS[3],
        lastMessage: "See you at the fellowship.",
        timestamp: '2h',
        unread: false,
    },
];
export const UNIVERSITIES = [
    'University of Lagos (UNILAG)',
    'University of Ibadan (UI)',
    'Covenant University',
    'Afe Babalola University (ABUAD)',
    'Babcock University',
    'University of Nigeria, Nsukka (UNN)',
    'Obafemi Awolowo University (OAU)',
    'Ahmadu Bello University (ABU)',
    'University of Ilorin (UNILORIN)',
    'Landmark University',
    'Lagos State University (LASU)',
    'Pan-Atlantic University',
    'Rivers State University',
    'Federal University of Technology, Akure (FUTA)',
    'Federal University of Technology, Minna (FUTMINNA)',
    'University of Benin (UNIBEN)',
    'Nnamdi Azikiwe University (UNIZIK)',
    'Bayero University Kano (BUK)',
    'University of Port Harcourt (UNIPORT)',
    'Bowen University',
];

export const NOTIFICATIONS = [
    {
        id: '1',
        type: 'like',
        user: USERS[1],
        content: 'liked your post about the new cafe.',
        timestamp: '2m ago',
        isUnread: true,
        relatedId: 'p1',
    },
    {
        id: '2',
        type: 'comment',
        user: USERS[2],
        content: 'commented: "Great advice! I will check it out."',
        timestamp: '15m ago',
        isUnread: true,
        relatedId: 'p2',
    },
    {
        id: '3',
        type: 'follow',
        user: USERS[3],
        content: 'started following you.',
        timestamp: '1h ago',
        isUnread: false,
        relatedId: 'u4',
    },
    {
        id: '4',
        type: 'system',
        user: null,
        content: 'Your property listing "Akoka Luxury Studio" has been approved!',
        timestamp: '3h ago',
        isUnread: false,
        relatedId: 'h1',
    },
    {
        id: '5',
        type: 'tour',
        user: USERS[4],
        content: 'requested a tour for "Landmark Heights".',
        timestamp: '5h ago',
        isUnread: true,
        relatedId: 'h1',
    },
    {
        id: '6',
        type: 'like',
        user: USERS[5],
        content: 'liked your comment on the exam schedules.',
        timestamp: '1d ago',
        isUnread: false,
        relatedId: 'p6',
    },
];
