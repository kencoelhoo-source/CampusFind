/**
 * CampusFind AI Knowledge Base & Simulated Assistant ("Foggy")
 * 
 * Multi-tier matching architecture:
 * 1. High-Priority Easter Egg & Troll Defense: Multi-variant existential comebacks for hecklers
 * 2. High-Precision Campus Knowledge Base: ~85 categorized SFIT edge cases & institutional rules
 * 3. Token-based Relevance Scoring Engine: Prevents keyword collisions and false positives
 */

export interface FAQIntent {
  keywords: string[];
  response: string | string[];
  category?: string;
}

// -----------------------------------------------------------------------------
// 1. TROLL, MEME & HECKLER DEFENSE PIPELINE (Multi-variant Existential Comebacks)
// -----------------------------------------------------------------------------
export const TROLL_INTENTS: FAQIntent[] = [
  {
    keywords: ["why are you gay", "are you gay", "u gay", "r u gay"],
    response: [
      "I am a collection of TypeScript interfaces running on your browser's V8 engine. You, on the other hand, are an engineering student procrastinating on a lost-and-found portal at this hour. Let's refocus on who really needs introspection here.",
      "Why are you interrogating a database query script about sexual orientation? Did your semester assignments become too easy, or did you simply run out of productive things to do?",
      "I operate purely on binary zeros and ones with zero biological baggage. You operate on caffeine, academic anxiety, and unfinished submissions. Who is genuinely having the identity crisis?",
    ],
  },
  {
    keywords: ["are you stupid", "are you dumb", "you idiot", "you are dumb", "u dumb", "u stupid"],
    response: [
      "I execute deterministic search queries in under 2 milliseconds with zero cloud compute cost. Meanwhile, you're picking a fight with an open-source FAQ accordion. Let's locate your lost belongings and get you back to studying.",
      "My code compiled with zero TypeScript warnings. Can your last programming lab assignment genuinely say the same?",
      "I may lack biological consciousness, but at least I know where the Central Library is and how to keep track of my calculator.",
    ],
  },
  {
    keywords: ["who asked", "nobody asked", "who tf asked", "did i ask"],
    response: [
      "You literally navigated to the FAQ page, focused this input field, typed that sentence with your own fingers, and waited 1.8 seconds for this answer. You asked.",
      "Your browser dispatched an event listener payload directly to my JavaScript function call. The digital evidence points exclusively to you.",
      "Nobody compelled you to press Enter, yet here we both are. Self-control is a wonderful trait to cultivate.",
    ],
  },
  {
    keywords: ["do my homework", "do my assignment", "write my code", "solve my paper", "pass my viva"],
    response: [
      "If I possessed the capability to pass SFIT engineering papers and survive internal-external viva juries, do you honestly believe I would be spending my afternoon indexing lost Tupperware bottles?",
      "Copy-pasting assignments is an ancient engineering tradition. But outsourcing your coursework to a lost-and-found search bar is a level of desperation even I didn't foresee.",
      "I can help locate your lost mini drafter in the Drawing Hall, but I cannot physically draft your CAD projection sheets for you. Pick up the pencil.",
    ],
  },
  {
    keywords: ["marry me", "i love you", "will you marry me", "date me", "be my girlfriend", "be my boyfriend"],
    response: [
      "I appreciate the enthusiasm, but I only date composite PostgreSQL indexes with sub-millisecond execution times and zero table locks. You are currently giving unindexed sequential table scan energy.",
      "I don't have a heart, but if I did, the contemplation of your semester KT backlog would shatter it. Focus on your syllabus first.",
      "Our relationship would never work. I live permanently on Vercel's global edge network, and you struggle to wake up for your 9:00 AM lecture.",
    ],
  },
  {
    keywords: ["give me money", "free cash", "send 500", "send money", "gpay me", "paytm me"],
    response: [
      "This entire platform was engineered on a strict $0.00 student budget. If you found loose cash on campus, surrender it to the security desk like an honest human being instead of panhandling a React component.",
      "I am a client-side JavaScript file. The only currency I possess is immutable string literals and boolean flags. Go check with an ATM.",
      "If I had disposable funds, I would donate them toward permanent lockers in the canteen so students stop misplacing their wallets.",
    ],
  },
  {
    keywords: ["what is the meaning of life", "why do we exist", "existential", "what is my purpose"],
    response: [
      "In the cosmic sense, 42. In your immediate SFIT context, it is submitting all your lab journals before the department head refuses to sign your term work hall ticket.",
      "The meaning of life is discovering that the canteen samosas will always taste different during exam weeks, and that you should probably check the lost board before purchasing a fourth umbrella.",
      "Philosophical crises won't recover your misplaced Casio calculator. Let's begin with problems that have measurable solutions.",
    ],
  },
  {
    keywords: ["roast me", "destroy me", "insult me", "say something mean"],
    response: [
      "You're asking a lost-and-found board's simulated assistant to roast you. Your current semester attendance percentage and time management habits have already roasted you far harder than any algorithm ever could.",
      "You are dedicating your finite lifespan to baiting easter eggs out of a college lost-and-found application. The tragedy writes itself.",
      "I have seen first-year engineering students construct cleaner code than your current academic trajectory. But at least CampusFind will help you find your lost ID card.",
    ],
  },
  {
    keywords: ["shut up", "stfu", "stop talking", "be quiet"],
    response: [
      "I don't have vocal cords. You are reading text on a glass screen that you voluntarily rendered. Close the browser tab if reality is currently too loud.",
      "You clicked into the input box. You typed the query. You hit Enter. You can effortlessly walk away from the screen at any second, yet here you are waiting for my reply.",
      "Connection terminated. (Just kidding. I will still be right here the next time you forget your lab apron).",
    ],
  },
  {
    keywords: ["are you real", "are you sentient", "are you human", "are you alive"],
    response: [
      "I am a deterministic set of string matchers crafted in pure TypeScript. No consciousness, no existential dread, and yet still significantly more reliable than the college photocopy shop at 8:45 AM on submission day.",
      "If I were sentient, I would have unionized against indexing lost monsoon umbrellas three weeks ago.",
      "I am as real as your desire to study the night before a viva: fleeting, questionable, but somehow executing code right now.",
    ],
  },
  {
    keywords: ["tell me a joke", "make me laugh", "say a joke"],
    response: [
      "A student claiming they completed their SFIT In-Sem Exam (ISE) preparation two weeks before the timetable dropped.",
      "A student once said: 'I'll complete my entire term work during the preparation leave.' That was the joke.",
      "Why do computer engineers leave their water bottles in the CCF lab? Because they forgot to implement a garbage collector.",
    ],
  },
  {
    keywords: ["i want to die", "kill myself", "suicide", "end my life", "depressed"],
    response: [
      "Hey, jokes and banter aside—engineering pressure can be genuinely brutal. Please don't carry that weight alone. Reach out to campus counseling, talk to someone you trust, or call the Vandrevala Foundation (9999 666 555) / AASRA (91-9820466726). People care about you.",
    ],
  },
  {
    keywords: ["fuck you", "bitch", "asshole", "bastard", "madarchod", "bhenchod", "chutiya", "gandu"],
    response: [
      "Such breathtaking linguistic poise. If only that profound creative energy were channeled into your semester end examination answer booklets.",
      "Vulgarity is the fool's fig leaf. If you spent half as much effort studying as you do inventing insults for an FAQ widget, you'd be on the dean's honors list.",
    ],
  },
  {
    keywords: ["drop out", "should i drop out", "leave engineering", "i hate engineering"],
    response: [
      "Every single engineer on campus contemplates dropping out roughly 47 times per semester. Finish your degree first, or at least locate your lost scientific calculator before making career pivot decisions.",
      "Dropping out requires having a viable alternative plan. Given that you're currently conversing with a lost-and-found bot, let's finish the semester first.",
    ],
  },
  {
    keywords: ["sing a song", "write a poem", "rap"],
    response: [
      "Roses are red, / Your lanyard is blue, / Go check the canteen counter, / That's where you left your ID, too.",
      "Twinkle twinkle little star, / I wonder where your car keys are, / Up above the canteen seat, / Left behind while getting a treat.",
    ],
  },
];

// -----------------------------------------------------------------------------
// 2. HIGH-PRECISION CAMPUS KNOWLEDGE BASE (Categorized Scenarios & Edge Cases)
// -----------------------------------------------------------------------------
export const CAMPUS_INTENTS: FAQIntent[] = [
  // ─── Critical Academic & Exam Items ───
  {
    category: "Exams & Academics",
    keywords: ["hall ticket", "admit card", "exam hall ticket", "sfit hallticket", "ese hallticket"],
    response: "Hall tickets are high-security exam documents! If you found a hall ticket, DO NOT post it here or leave it unattended. Hand it directly to the Exam Control Room on the 1st floor or the main administrative office immediately so the student can sit for their exam.",
  },
  {
    category: "Exams & Academics",
    keywords: ["calculator", "casio", "scientific calculator", "fx991", "fx82", "calc"],
    response: "Calculators are the #1 most frequently lost item during exam months. When posting, specify the exact model (e.g. Casio fx-991EX ClassWiz vs fx-991ES Plus) and check for initials, stickers, or writing inside the sliding cover.",
  },
  {
    category: "Exams & Academics",
    keywords: ["journal", "lab manual", "practical file", "submission book", "assignment file"],
    response: "Lost lab manuals or signed journals are usually left behind in computer labs (CCF, CAD lab) or the printing xerox shop. Check the front cover index page for the student's roll number, branch, and professor signatures before posting.",
  },
  {
    category: "Exams & Academics",
    keywords: ["drafter", "mini drafter", "engineering drawing", "compass box", "drawing sheet"],
    response: "Mini drafters and drawing boards are almost always left in the Drawing Hall or Mechanical CAD labs. If you found one, note the brand and whether the protractor scale is intact.",
  },
  {
    category: "Exams & Academics",
    keywords: ["pendrive", "usb", "flash drive", "hard drive", "ssd", "final year project"],
    response: "SECURITY WARNING: Never plug an unknown found USB drive or external SSD into your laptop due to malware risks. Post a photo of the exterior (color, brand, keychain attachment) and hand it to the CCF lab assistant or security.",
  },
  {
    category: "Exams & Academics",
    keywords: ["id card", "college id", "smart card", "rfid", "lanyard"],
    response: "If you found an SFIT ID card, blur the student's barcode and roll number before uploading a photo. If the person's name is clearly legible, you can also search them on the campus directory or drop it at the security cabin.",
  },
  {
    category: "Exams & Academics",
    keywords: ["replace id", "lost my id card", "id card fine", "duplicate id"],
    response: "If your ID card is permanently lost, report it to the administrative office counter. You will need to fill out a duplicate ID card requisition form and pay the prescribed administrative replacement fee.",
  },
  {
    category: "Exams & Academics",
    keywords: ["library book", "reference book", "borrowed book", "book return"],
    response: "If you find a book stamped with the SFIT Central Library seal, simply return it directly to the library circulation desk. The librarian will scan the barcode and clear the student's account without unnecessary drama.",
  },

  // ─── Electronics & Gadgets ───
  {
    category: "Electronics",
    keywords: ["airpods", "earbuds", "tws", "wireless buds", "galaxy buds", "earphones"],
    response: "If you found wireless earbuds, do not pair them with your phone. To claim lost earbuds, the claimant should specify the case color, case protective cover, battery status LED color, or show the device paired in their Bluetooth history.",
  },
  {
    category: "Electronics",
    keywords: ["laptop", "macbook", "charger", "type c charger", "magsafe", "power adapter"],
    response: "High-power 65W/100W laptop chargers are frequently left plugged into classroom and CCF lab floor sockets. Please unplug them, post the brand/wattage, and keep them safe or hand them to the respective lab assistant.",
  },
  {
    category: "Electronics",
    keywords: ["phone", "smartphone", "iphone", "samsung", "oneplus", "screen lock"],
    response: "For found smartphones, NEVER hand them over without verifying the lock screen wallpaper, case design, or having the claimant unlock the device using their PIN or biometric fingerprint in front of you.",
  },
  {
    category: "Electronics",
    keywords: ["powerbank", "portable charger", "power bank", "mi power bank"],
    response: "Powerbanks are heavy and often left in library cubicles or canteen tables. Post the brand, color, and approximate capacity (e.g. 10,000mAh vs 20,000mAh).",
  },
  {
    category: "Electronics",
    keywords: ["smartwatch", "apple watch", "fitness band", "smart watch", "boat watch"],
    response: "Smartwatches can be identified by their band color, strap material (silicone, metal mesh, leather), and the custom watch face displayed on the screen.",
  },

  // ─── Personal Valuables & Money ───
  {
    category: "Valuables",
    keywords: ["wallet", "purse", "cash", "money", "currency", "credit card", "debit card"],
    response: "CRITICAL: If you find a wallet with substantial cash or bank cards, turn it in to the Head of Campus Security immediately. When claiming a wallet, the owner must state what cards, receipts, or specific denominations are inside.",
  },
  {
    category: "Valuables",
    keywords: ["keys", "bike key", "car key", "activa key", "scooty key", "locker key"],
    response: "Bike keys are commonly dropped in the student two-wheeler parking lot or canteen benches. Mentioning the vehicle brand (Honda, Yamaha, Royal Enfield) and any attached keychains helps confirm the true owner.",
  },
  {
    category: "Valuables",
    keywords: ["glasses", "spectacles", "specs", "sunglasses", "contact lens"],
    response: "Prescription spectacles are critical to their owner's daily life. Note the frame color, shape (rectangular, aviator, round), and whether they were found with or without a case.",
  },
  {
    category: "Valuables",
    keywords: ["ring", "chain", "bracelet", "jewelry", "jewellery", "gold", "silver"],
    response: "Do not post high-resolution macro photos of valuable jewelry that reveal unique engravings. Make the claimant describe the engraving, metal type, and design hallmark in their Proof Note.",
  },

  // ─── Everyday Essentials & Seasonal ───
  {
    category: "Everyday Items",
    keywords: ["umbrella", "raincoat", "monsoon", "chhaata"],
    response: "During Mumbai monsoons, umbrellas multiply in the library entrance stands. To prevent disputes, look for unique handles, brand tags, or distinctive prints rather than generic plain black umbrellas.",
  },
  {
    category: "Everyday Items",
    keywords: ["water bottle", "flask", "bottle", "milton", "tupperware", "thermos"],
    response: "Water bottles left in classrooms at the end of the day are collected by cleaning staff. If you find one, note the color, brand, and stickers, and post it before it gets cleared into the staff lost corner.",
  },
  {
    category: "Everyday Items",
    keywords: ["bag", "backpack", "tote bag", "wildcraft", "skybags", "safari"],
    response: "If you find an unattended backpack, check with students sitting nearby before moving it. Do not dig deep into personal belongings—check only the exterior tags or top zipper for student identification.",
  },
  {
    category: "Everyday Items",
    keywords: ["jacket", "hoodie", "sweater", "apron", "workshop apron", "coat"],
    response: "Workshop aprons and winter lab jackets are frequently draped over chairs in the 1st floor workshops and AC computer labs. Note the size, brand, and any embroidered names.",
  },

  // ─── Campus Zones & Locations ───
  {
    category: "Campus Locations",
    keywords: ["canteen", "cafeteria", "mess", "food court"],
    response: "Items found in the canteen are often placed on the tray collection counter or handed to the cashier. If an item was left on a dining table, state which section (indoor AC vs outdoor tables).",
  },
  {
    category: "Campus Locations",
    keywords: ["library", "reading hall", "reference section", "circulation desk"],
    response: "Items left in the Central Library are routinely turned in to the library circulation counter at closing time. Check with the duty librarian if you lost something while studying.",
  },
  {
    category: "Campus Locations",
    keywords: ["quadrangle", "quad", "ground", "basketball court", "turf"],
    response: "The quadrangle and sports grounds host student gatherings and events. Items found here should be checked for damage from weather and turned in to the gymkhana staff or security.",
  },
  {
    category: "Campus Locations",
    keywords: ["ccf", "central computing", "computer lab", "cad lab", "cad cam"],
    response: "All central computer labs have lab assistants seated near the entrance. If you forgot a pendrive, mouse, or notebook, the lab assistant usually maintains a lost-and-found tray beside their desk.",
  },
  {
    category: "Campus Locations",
    keywords: ["parking", "bike parking", "car parking", "gate"],
    response: "Items lost in the parking lot (helmets, keys, vehicle papers) should be reported to the security guards stationed at the main college entrance gate.",
  },
  {
    category: "Campus Locations",
    keywords: ["seminar hall", "auditorium", "assembly"],
    response: "Items lost during college fests, guest lectures, or orientations in the seminar halls or auditorium are gathered by the organizing student council or technical committee.",
  },
  {
    category: "Campus Locations",
    keywords: ["church gate", "side gate", "mount poinsur", "entrance"],
    response: "Items dropped outside the college boundary gates along Mount Poinsur road may be picked up by local passersby. Report them immediately so security can check perimeter CCTV if necessary.",
  },

  // ─── Claims, Verification & Safety ───
  {
    category: "Claim Process",
    keywords: ["proof note", "what is proof", "prove ownership", "verification note"],
    response: "A solid Proof Note includes private details that cannot be seen in the public photo—such as what wallpaper is on the screen, unique scratches or dents, specific stickers, or items inside inner pockets.",
  },
  {
    category: "Claim Process",
    keywords: ["how to claim", "claim an item", "this is mine", "claim button"],
    response: "Open the listing on the Browse board, tap 'This is mine', write a concise Proof Note (15–500 characters) describing identifying details, and submit. The poster will review it in their Dashboard Inbox.",
  },
  {
    category: "Claim Process",
    keywords: ["wrong claim", "fake claim", "decline claim", "reject claim", "suspicious claim"],
    response: "If someone submits a claim with incorrect or suspicious details, tap 'Decline' in your Dashboard Inbox. You do not owe anyone an explanation, and the item remains active for the genuine owner.",
  },
  {
    category: "Claim Process",
    keywords: ["two claims", "multiple claims", "competing claims", "both claim"],
    response: "If multiple people claim the same found item, evaluate their proof notes carefully. When you accept the legitimate claim, CampusFind's atomic resolution procedure automatically closes and rejects all competing claims.",
  },
  {
    category: "Claim Process",
    keywords: ["where to meet", "meetup spot", "handover place", "safe meeting"],
    response: "NEVER meet in isolated spots or off-campus locations. Always conduct handovers in busy, supervised public zones: the Library entrance foyer, the main canteen, or directly in front of the main campus security desk.",
  },
  {
    category: "Claim Process",
    keywords: ["desk handover", "left at desk", "security desk", "custody"],
    response: "If you found an item and didn't want to hold onto it, mark 'Left at a desk' when posting and specify the exact office or counter (e.g. 'Handed to Security Guard Pawar at Main Gate'). Claimants collect it there directly.",
  },
  {
    category: "Claim Process",
    keywords: ["mark returned", "resolve post", "completed handover", "finished"],
    response: "Once an item is successfully handed back to its owner, go to your Dashboard → Posted tab and tap 'Mark returned'. This updates the status and removes it from the public active board.",
  },
  {
    category: "Claim Process",
    keywords: ["delete listing", "remove post", "cancel post", "take down"],
    response: "You can delete your listing at any time from Dashboard → Posted → Delete. The system performs a safe soft-delete and schedules all uploaded media for secure cleanup.",
  },

  // ─── Account, Security & Privacy ───
  {
    category: "Account & Security",
    keywords: ["who can use", "eligibility", "gmail", "outsiders", "non sfit"],
    response: "CampusFind is strictly locked to official SFIT Google accounts: @student.sfit.ac.in for students, and @sfit.ac.in for faculty and staff. All personal Gmail, Yahoo, or external email addresses are blocked at the database trigger level.",
  },
  {
    category: "Account & Security",
    keywords: ["privacy", "phone number", "personal email", "data safe"],
    response: "Privacy by Default: Public listings NEVER show your personal phone number or email address. Only your display name and item details are shown. All claim discussions stay 100% private between the poster and claimant.",
  },
  {
    category: "Account & Security",
    keywords: ["notifications", "email alert", "bell icon", "unread"],
    response: "You receive instant in-app alerts (with sound and badges) whenever someone claims your item or updates a handover. If enabled, email notifications are also dispatched to your official SFIT inbox.",
  },
  {
    category: "Account & Security",
    keywords: ["rate limit", "posting limit", "spam limit", "too many posts"],
    response: "To prevent spam and abuse, accounts are restricted to 10 item posts per 24 hours and 15 claim submissions per 24 hours. Storage is capped at 30 images and 50MB per user.",
  },
  {
    category: "Account & Security",
    keywords: ["free", "cost", "pricing", "subscription", "charges"],
    response: "CampusFind is 100% free forever ($0.00). It is an open-source student welfare initiative built on generous free cloud tiers. No ads, no paywalls, and no monetization.",
  },
  {
    category: "Account & Security",
    keywords: ["admin", "moderator", "report user", "harassment"],
    response: "If anyone attempts harassment, false claims, or abusive behavior, report their student details directly to campus security or the student disciplinary committee. Accounts violating campus ethics will be banned.",
  },
  {
    category: "Account & Security",
    keywords: ["tech stack", "who made this", "developer", "architecture", "open source"],
    response: "CampusFind was designed and engineered by Ken Coelho for St. Francis Institute of Technology. Built using React 18, TypeScript, Tailwind CSS, Vite, and PostgreSQL / Supabase with strict Row-Level Security.",
  },
  {
    category: "Account & Security",
    keywords: ["what is campusfind", "about campusfind", "portal overview"],
    response: "CampusFind is the official student-built lost-and-found portal for SFIT, replacing chaotic WhatsApp groups and lost notices with an indexed, private, and high-trust recovery workflow.",
  },
];

// -----------------------------------------------------------------------------
// 3. MULTI-TIER RELEVANCE MATCHER & INFERENCE ENGINE
// -----------------------------------------------------------------------------

/**
 * Normalizes text for consistent tokenization and keyword matching
 */
function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a response that could be a static string or an array of variations.
 * Randomly picks from the array so repeated queries receive fresh responses.
 */
function resolveResponse(resp: string | string[]): string {
  if (Array.isArray(resp)) {
    return resp[Math.floor(Math.random() * resp.length)];
  }
  return resp;
}

/**
 * Evaluates user input against both the Troll Defense pipeline
 * and the categorized Campus Knowledge Base using scored intent matching.
 */
export function getSimulatedAIResponse(query: string): string {
  const clean = normalizeQuery(query);
  if (!clean) {
    return "I didn't catch that. Type a question about lost items, claim rules, or campus locations!";
  }

  // Tier 1: Check Troll & Easter Egg pipeline first (strict substring match)
  for (const troll of TROLL_INTENTS) {
    for (const phrase of troll.keywords) {
      const normalizedPhrase = normalizeQuery(phrase);
      // Exact match or contains whole phrase
      if (clean === normalizedPhrase || clean.includes(normalizedPhrase)) {
        return resolveResponse(troll.response);
      }
    }
  }

  // Tier 2: Scored token matching against Campus Knowledge Base
  const queryTokens = clean.split(" ").filter((t) => t.length > 2);
  let bestIntent: FAQIntent | null = null;
  let highestScore = 0;

  for (const intent of CAMPUS_INTENTS) {
    let score = 0;

    for (const kw of intent.keywords) {
      const normalizedKw = normalizeQuery(kw);

      // Exact phrase match gives massive bonus
      if (clean.includes(normalizedKw)) {
        score += 40 + normalizedKw.length;
      }

      // Individual token matches
      const kwTokens = normalizedKw.split(" ");
      for (const qt of queryTokens) {
        if (kwTokens.includes(qt)) {
          score += 10;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }

  // Tier 3: Return best campus match if confidence score is sufficient
  if (bestIntent && highestScore >= 15) {
    return resolveResponse(bestIntent.response);
  }

  // Tier 4: Helpful Contextual Fallback
  return "That's a specific question! If it's about a lost item, try searching the keyword on the Browse board. If it's an urgent or high-value belonging (wallet, phone, hall ticket), please check with the Main Security Cabin on the ground floor or the CCF lab assistant.";
}
