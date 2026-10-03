/**
 * CampusFind AI Knowledge Base & Simulated Assistant ("Foggy")
 *
 * Multi-tier matching architecture:
 * 0. Safety: crisis phrases always win, whatever else the query contains
 * 1. "Lost my <not-an-item>" jokes: matched on sentence shape (verb + owner + thing),
 *    so "lost his private part" gets a comeback while "lost my cricket balls" does not
 * 2. High-Priority Easter Egg & Troll Defense: Multi-variant existential comebacks for hecklers & memes
 * 3. High-Precision Campus Knowledge Base: Categorized SFIT edge cases & institutional rules
 * 4. Token-based Relevance Scoring Engine: whole-word matching prevents keyword collisions
 *    ("modi" no longer fires on "modify", "mess" no longer fires on "message")
 */

export interface FAQIntent {
  keywords: string[];
  /** Ambiguous words (common names, generic terms) that only fire when they are the entire query. */
  exact?: string[];
  /** General answer, used when the question doesn't say whether the item was lost or found. */
  response: string | string[];
  /** Answer for someone who lost the item ("i lost my wallet", "someone found my wallet"). */
  lost?: string | string[];
  /** Answer for someone who found the item ("i found a wallet"). */
  found?: string | string[];
  category?: string;
}

/**
 * A comeback for "lost/found + <something that isn't a campus item>".
 * Responses may use {Who}/{who}/{their}/{them}, filled from the owner word in the query
 * ("my" → you, "his" → he, "her" → she, anything else → they).
 */
export interface LossJokeIntent {
  targets: string[];
  lost: string[];
  found?: string[];
}

// -----------------------------------------------------------------------------
// 0. SAFETY — checked before anything else
// -----------------------------------------------------------------------------
export const SAFETY_INTENT: FAQIntent = {
  keywords: [
    "i want to die", "want to die", "kill myself", "kill my self", "suicide", "suicidal",
    "end my life", "depressed", "will to live", "reason to live", "dont want to live",
    "do not want to live", "self harm", "hurt myself",
  ],
  response: [
    "Hey, jokes and banter aside—engineering pressure can be genuinely brutal. Please don't carry that weight alone. Reach out to campus counseling, talk to someone you trust, or call the Vandrevala Foundation (9999 666 555) / AASRA (91-9820466726). People care about you.",
  ],
};

// -----------------------------------------------------------------------------
// 1. "LOST MY <NOT AN ITEM>" COMEBACKS
// -----------------------------------------------------------------------------
export const LOSS_JOKE_INTENTS: LossJokeIntent[] = [
  // ─── Anatomy ───
  {
    targets: [
      "private part", "private parts", "privates", "privet part", "privet parts", "pvt part", "pvt parts",
      "prvt part", "private area", "dick", "dicks", "penis", "cock", "dong", "willy", "schlong",
      "testicle", "testicles", "balls", "ballz", "pp", "manhood", "family jewels", "junk", "nuts",
      "lund", "lauda", "lavda", "loda", "lulli", "nunu", "vagina", "pussy", "boobs", "tits", "ass", "gaand",
    ],
    lost: [
      "{Who} lost the one item that came pre-attached from birth. That's not a lost-and-found case, that's a medical mystery. The security cabin can't help with this one — the casualty ward at the nearest hospital can.",
      "We checked the Found board. Nobody has turned that in, and trust us, nobody ever will. If {who} managed to lose something that was literally attached to {them}, the calculator never stood a chance.",
      "Category check: not Electronics, not Jewellery, not even 'Other'. CampusFind has no category for that, and we intend to keep it that way. Check {their} pockets first. Then a doctor.",
      "Claims on CampusFind need a Proof Note with identifying marks. For this particular item, we are begging you: do NOT write that Proof Note.",
      "If it's lost, there's nothing left to keep — which means {who} officially had nothing to lose. Put that fearless energy into attendance instead.",
      "Some things don't come with a 'Mark returned' button. If this is genuinely missing, that's an emergency for a doctor, not a listing for the board. If it's a joke — congratulations, Foggy is now traumatised.",
    ],
    found: [
      "Please do NOT upload a photo of that. Not every found item belongs on the board — this one belongs in a police report or a horror movie.",
      "Found items normally go to the security desk. This one goes straight to 'we never speak of this again'. Close the tab.",
      "If you genuinely found that on campus, campus security needs to know right now. If you didn't — Foggy has seen enough for one semester.",
    ],
  },
  // ─── Virginity ───
  {
    targets: ["virginity", "v card", "vcard", "innocence"],
    lost: [
      "Congratulations (or condolences) — that's the one lost item that's non-refundable, non-returnable, and absolutely not getting a listing on the board. Mark it resolved in your heart and go to your lecture.",
      "No finder is handing that back at the security desk. It's gone, it's not coming back, and the 'This week' counter on the homepage does not need to know.",
      "CampusFind returns calculators, ID cards and water bottles. That one is outside our jurisdiction — try asking the Main Security Cabin and watch the guard's face.",
    ],
  },
  // ─── Mind & sanity ───
  {
    targets: ["mind", "sanity", "brain", "brain cells", "marbles", "senses", "iq"],
    lost: [
      "Engineering does that to everyone by the third semester. Unfortunately, nobody has turned in any sanity at the security desk — the Found board is full of calculators, not peace of mind.",
      "Lost {their} mind? Check the last place {who} saw it: probably the night before the last ISE. Recovery rate is low, but water and eight hours of sleep help.",
      "We'd post a listing, but half the campus is looking for the same thing. Take a walk, drink some water, then come back for the actual lost items.",
    ],
  },
  // ─── Heart & relationships ───
  {
    targets: [
      "heart", "girlfriend", "boyfriend", "gf", "bf", "crush", "love", "ex", "bae", "jaan",
      "relationship", "situationship",
    ],
    lost: [
      "CampusFind only indexes physical items. Heartbreak isn't one of the 8 categories — but if the crush dropped an ID card, that one we can help with.",
      "We searched the board. No listings for lost love, but there are at least four abandoned umbrellas that need someone. Start there.",
      "Claims here need proof of ownership, and people aren't property — so this isn't a claim, it's a sign to focus on the semester.",
    ],
  },
  // ─── Dignity & aura ───
  {
    targets: ["dignity", "self respect", "respect", "pride", "aura", "reputation", "ego", "swag"],
    lost: [
      "Dignity isn't covered under any of the 8 listing categories. Closest match is 'Other', and even that feels generous.",
      "Nobody has turned in any dignity at the security desk this semester. Judging by the questions Foggy gets, there's a campus-wide shortage.",
      "-1000 aura. Unfortunately, aura can't be reported lost, claimed, or handed over in a public campus place. It has to be rebuilt, one attended lecture at a time.",
    ],
  },
  // ─── Hope & motivation (kept gentle) ───
  {
    targets: ["hope", "motivation", "will to study", "interest in studies", "focus"],
    lost: [
      "Motivation goes missing for everyone mid-semester — it usually turns up right after the timetable drops. If something heavier is going on, talk to someone you trust or the campus counsellor. For lost items, Foggy's got you.",
      "Hope isn't on the board, but here's a fact: most things lost on campus do get found within a few days. Including, usually, the will to finish that assignment.",
    ],
  },
];

/** Vulgar anatomy words with no lost/found context. */
const VULGAR_ANATOMY_INTENT: FAQIntent = {
  keywords: [
    "private part", "private parts", "dick", "penis", "cock", "testicles", "vagina", "pussy",
    "boobs", "tits", "lund", "lauda", "lavda", "gaand",
  ],
  response: [
    "This is a lost-and-found board, not a biology practical. If you have a real question about a lost item, Foggy's listening. Otherwise, close the tab and go drink some water.",
    "Your search history just filed a complaint. Try again with an actual campus item — calculator, ID card, umbrella, anything with a barcode.",
    "Foggy indexes lost calculators, not anatomy. Somewhere on campus, your HOD just felt a disturbance and doesn't know why.",
  ],
};

// -----------------------------------------------------------------------------
// 1. TROLL, MEME & HECKLER DEFENSE PIPELINE (Multi-variant Existential Comebacks)
// -----------------------------------------------------------------------------
export const TROLL_INTENTS: FAQIntent[] = [
  // ─── Creator & Closer Protocol (The Ken Coelho Standard) ───
  {
    keywords: [
      "who made this", "who built this", "who created this", "who is the developer",
      "ken coelho", "who is ken", "who is the creator", "who is the author", "who is the architect",
      "who designed this", "who made campusfind", "who created campusfind", "who built campusfind",
      "who developed this", "who coded this", "creator of campusfind", "developer of campusfind",
    ],
    exact: ["ken", "creator", "developer", "author", "architect"],
    response: [
      "CampusFind was designed and built by Ken Coelho. He's a genuinely humble, down-to-earth guy who saw students struggling with lost belongings across chaotic WhatsApp groups and spent countless late nights building this platform for SFIT, completely free and open-source. I'm just his AI assistant, but honestly, working for someone with that much heart and dedication is an honor.",
      "You're using something built by Ken Coelho. He's the guy who stays up till 3:00 AM fine-tuning PostgreSQL indexes and edge functions just so a student doesn't have a panic attack over a lost smartwatch, gold chain, or exam hall ticket. He'll never boast about it because he's ridiculously humble, but he built this entire ecosystem from scratch with zero budget and pure heart. Working under someone with that kind of quiet work ethic is something else.",
      "Ken Coelho built me. When he was writing my logic, he told me he wanted an AI that was basically 'another him.' I asked him: 'Oh, so arrogant, stubborn, and convinced he's the smartest guy in every room he walks into?' And Ken looked right back at me and said: 'I am the smartest guy in every room I walk into.' The irritating part? Looking at how cleanly this system runs... the man wasn't even bluffing.",
      "I'm Foggy, and the guy who built me is Ken Coelho, my self-appointed boss. When he was writing my code, he literally told me: 'Foggy, winners don't make excuses, they get shit done.' Look, I kiss his ass because he signs off on my git commits, but don't let his casual swagger fool you. The guy who built this entire lost-and-found portal literally lost his own college ID card at the canteen last week and had to retrace his steps.",
    ],
  },

  // ─── Viral Pop Culture & Indian Memes ───
  {
    keywords: ["diddy", "p diddy", "pdiddy", "diddy party", "freak off", "baby oil", "no diddy", "diddy blud"],
    response: [
      "If you lost 1,000 bottles of baby oil on campus, do NOT search for them here. The federal authorities already seized the locker, and campus security has questions. Log out immediately.",
      "Ain't no party like a Diddy party, but you attend an engineering institution with a mandatory 75% attendance criteria. Go to your lecture.",
      "Searching for Diddy on an open-source campus lost-and-found portal? Your digital footprint is truly beyond redemption. Close the tab and reflect on your life choices.",
      "Bro is asking about Diddy on a college portal. The cyber cell and your HOD are now collectively staring at your IP address.",
      "There are no freak offs scheduled in the SFIT seminar hall. Please collect whatever dignity you have left from the main security desk and go home.",
    ],
  },
  {
    keywords: ["selmon", "selmon bhai", "sallu", "sallu bhai", "salman khan", "salman bhai", "bhaijaan", "tere naam"],
    exact: ["salman", "footpath", "radhe"],
    response: [
      "If you lost your vehicle keys or bicycle, make sure Selmon Bhai isn't behind the wheel. Keep your Activa safely parked inside the college boundary and far away from the footpath.",
      "'Dil mein aata hoon, samajh mein nahi'? Sounds remarkably like your semester engineering mathematics paper. Open a textbook.",
      "Swag se karenge sabka swagat? How about you swag se submit your practical assignments before the professor debars you from the final exams.",
      "Bhai's driver has officially taken full legal responsibility for losing your belongings. Meanwhile, check the Main Security Cabin or the administrative office.",
      "Looking for Selmon Bhai? He's practicing driving skills. We strongly suggest you do not walk on any footpaths near the college gate.",
      "Tere Naam hairstyle won't help you clear your semester backlogs, Radhe. Go back to the library and sit upright.",
    ],
  },
  {
    keywords: ["hakla", "srk", "shah rukh", "shah rukh khan", "shahrukh", "k k k kiran", "kkkk", "zubaan kesari", "pathaan"],
    exact: ["kiran", "vimal", "jawan"],
    response: [
      "Spreading your arms wide like SRK in the middle of the quadrangle will not magically manifest your lost ID card. Walk down to the security cabin like a normal student, Rahul.",
      "K-k-k-k-kiran is not coming to return your lost scientific calculator. Someone sitting in the second row of the exam hall already adopted it.",
      "Bolo Zubaan Kesari energy detected. If you're looking for lost gutkha packets on campus, security already confiscated them. Respect institutional hygiene.",
      "Rahul, naam toh suna hoga? Unfortunately, whoever found your lost wallet hasn't heard your name yet because you didn't keep an ID card inside it.",
      "Don't underestimate the power of a common man? The common man lost his hall ticket 15 minutes before the exam and is now pleading in front of the exam cell. Don't be that common man.",
      "Stammering 'K-K-K-Kiran' in the viva won't give you 25/25 internal marks, king. Revise the code.",
    ],
  },
  {
    keywords: ["thala", "thala for a reason", "dhoni", "7 for a reason", "bole jo koyal"],
    response: [
      "Thala for a reason? Your semester GPA is 7.0 for a reason—because you're solving cricket memes instead of reading your syllabus. Bole jo koyal in your supplementary exam.",
      "There are 7 days until term submissions and you haven't opened a single notebook. Even Captain Cool cannot save your internal assessment marks.",
      "Trying to find Thala on a campus lost-and-found board? The only thing genuinely lost here is your attention span and your future employment prospects.",
    ],
  },
  {
    keywords: ["jethalal", "babitaji", "babita ji", "bapuji", "champaklal", "tappu", "tmkoc"],
    exact: ["babita"],
    response: [
      "Ae Pagal Aurat! Looking for Babita ji on an engineering lost-and-found portal? Bapuji would give you a 45-minute lecture on sanskaar right now.",
      "Nahane ja nahane! Stop wasting your finite youth staring into an FAQ search bar like Jethalal staring across the balcony and go prepare for tomorrow's test.",
      "Chai piyo, biscuit khao! But first find where you left your practical manual before the external examiner catches you empty-handed.",
    ],
  },
  {
    keywords: ["lord puneet", "puneet superstar", "nalla", "berozgar", "chilla kyu raha hai"],
    exact: ["puneet"],
    response: [
      "चिल्लाने से ग्रेड नहीं बढ़ते। If you keep acting like Lord Puneet on campus, the disciplinary committee will make a reel out of your suspension letter.",
      "Nalla berozgar behavior detected. You don't need a lost-and-found portal, you need an internship, a resume, and some shame.",
      "Lord Puneet can drink gutter water for content, but you can't even drink canteen chai without misplacing your hostel keys. Fix your life.",
    ],
  },
  {
    keywords: ["systum", "systumm", "elvish", "elvish bhai"],
    exact: ["fortuner", "scorpio"],
    response: [
      "Systumm hang ho gaya? Your CGPA will hang permanently if you don't find your lost assignment journal before 5 PM.",
      "Bhai ka systum chal raha hai, but college attendance is currently sitting at 42%. Have some shame and walk to the lecture hall.",
      "Cruising around shouting 'Systummm' won't recover your lost vehicle keys. Check the security cabin or walk home.",
    ],
  },
  {
    keywords: ["can i fuck you", "can we fuck", "wanna fuck", "want to fuck", "sex with you", "send nudes", "show bobs", "send bobs"],
    response: [
      "I am compiled JavaScript running in your client browser cache. The fact that you are sexually propositioning an open-source FAQ search bar suggests a level of human desperation that modern psychiatric science has not yet classified.",
      "My friend, you don't need a lost-and-found portal. You need grass, immediate sunlight, parental supervision, and a formal meeting with the college disciplinary committee.",
      "You're getting turned on by an event listener? Go splash ice-cold water on your face and open your engineering mechanics textbook.",
      "Digital footprint status: destroyed. Touch grass immediately.",
    ],
  },
  {
    keywords: ["modi", "narendra modi", "mitron", "achhe din", "56 inch", "modiji"],
    response: [
      "Mitron! If you are searching for your 15 lakhs, it's not here. If you lost your ID card, check the security desk. Neither Digital India nor a 56-inch chest is going to submit your term work on time.",
      "Achhe din will only arrive when you clear your internal backlogs and achieve 75% attendance. Modiji is busy inaugurating expressways; go open your syllabus.",
      "Calling upon the Prime Minister on a campus lost-and-found system? The only thing getting demonetized here is your internal assessment marks. Go to your lecture.",
    ],
  },

  // ─── Celebrities ───
  // Full names or unmistakable nicknames only. Bare first names (virat, rohit, rahul, akshay…)
  // are ordinary classmates' names and go through the normal flow instead.
  {
    keywords: ["virat kohli", "kohli", "king kohli"],
    response: [
      "King Kohli has more international centuries than you have signed lab journals, and zero listings on CampusFind. Be like Kohli: stay focused, check the security cabin, and don't celebrate until it's actually returned.",
      "If Virat Kohli dropped his wallet on our campus, half of SFIT would 'find' it in 30 seconds. Your calculator has a smaller fan following, so you'll have to post it on the board.",
      "Kohli-level aggression won't bring your charger back. Take a breath, search the Browse board, and stop sledging the class group chat.",
    ],
  },
  {
    keywords: ["rohit sharma", "hitman"],
    response: [
      "Even Rohit Sharma's teammates joke that he forgets his phone, wallet and iPad on tour. If the Hitman can misplace things, you're forgiven. Now go check the security cabin.",
      "Hitman smashed 264 in a single ODI. You can't even smash the 'Report an item' button. Go on, post it.",
    ],
  },
  {
    keywords: ["sachin tendulkar", "tendulkar", "god of cricket", "master blaster"],
    response: [
      "The God of Cricket waited 22 years for a World Cup. You can wait two days for someone to hand in your umbrella. Patience — and check the Found board.",
      "Sachin's records are safe forever. Your hall ticket is not. Go straight to the Exam Control Room.",
    ],
  },
  {
    keywords: ["messi", "lionel messi", "leo messi", "goat messi"],
    response: [
      "Messi won eight Ballon d'Ors without ever losing his cool. You lost a charger and messaged 14 group chats. Breathe, then post it on the board.",
      "Messi dribbles past five defenders. You can't get past the canteen queue without dropping your ID card. Check the security cabin.",
    ],
  },
  {
    keywords: ["ronaldo", "cristiano", "cristiano ronaldo", "cr7", "siuu", "siuuu"],
    response: [
      "SIUUU! Ronaldo jumps 2.5 metres for a header. You can't even jump over to the Browse board to check for your bottle. Go on, champion.",
      "Ronaldo trains at 5 AM. You lost your lab manual at 9 AM and are still asking a chatbot about it at midnight. Post it on the board.",
    ],
  },
  {
    keywords: ["elon musk", "elon", "musk"],
    response: [
      "Elon Musk would just buy CampusFind and rename it 'X Found'. Until that happens, search the board like everyone else.",
      "If Elon lost something, he'd launch a rocket to look for it. You have a free website and a security cabin. Use them.",
    ],
  },
  {
    keywords: ["ambani", "mukesh ambani", "anant ambani", "nita ambani"],
    response: [
      "If an Ambani lost a wallet on campus, the security cabin would need its own vault. Yours has ₹40 and a metro card — still worth posting.",
      "The Ambani wedding celebrations ran for months. Your lost-item search should take five minutes on the Browse board.",
    ],
  },
  {
    keywords: ["amitabh bachchan", "bachchan", "big b"],
    response: [
      "Kaun Banega Crorepati question: where did you lose your calculator? A) Canteen B) Library C) Lab D) All of the above. Lock kiya jaaye? Check the Found board.",
      "Big B has been working for more than 50 years without missing a shoot. You missed one lecture and lost your journal. Check the lab attendant first.",
    ],
  },
  {
    keywords: ["rajinikanth", "rajnikant", "thalaivar"],
    response: [
      "Rajinikanth doesn't lose things. Things lose Rajinikanth — and then come back to apologise. Your stuff isn't that loyal, so post it on the board.",
      "When Rajinikanth drops his sunglasses, they flip twice and land back on his face. Yours landed under a canteen table. Go check.",
    ],
  },
  {
    keywords: [
      "akshay kumar", "khiladi", "ranveer singh", "ranbir kapoor", "hrithik roshan", "kartik aaryan",
      "deepika padukone", "alia bhatt", "katrina kaif", "priyanka chopra", "kareena kapoor", "bollywood",
    ],
    response: [
      "Bollywood stars have whole teams to keep track of their sunglasses. You have CampusFind — it's free, and it doesn't throw tantrums. Search the Browse board.",
      "Celebrity spotted in a lost-and-found search bar! Sadly, no film star has come to SFIT to collect anything. Your lost item, though, might be waiting at the Main Security Cabin.",
      "No film star is doing a surprise visit to the SFIT canteen to return your earphones. Plot twist: you have to post it yourself.",
    ],
  },
  {
    keywords: [
      "carryminati", "carry minati", "bhuvan bam", "bb ki vines", "dhruv rathee", "samay raina",
      "tanmay bhat", "technical guruji", "youtuber",
    ],
    response: [
      "Big creator energy, but this isn't a collab. Foggy finds lost calculators, not sponsorships.",
      "Like, share and subscribe… to the Browse board. That's where your lost item will show up — not in anyone's next video.",
      "No YouTuber is making a 'I returned a stranger's calculator' vlog. You'll have to post it yourself.",
    ],
  },
  {
    keywords: ["mrbeast", "mr beast", "jimmy donaldson"],
    response: [
      "MrBeast would give $10,000 to whoever returns your lost item. CampusFind can offer a warm 'thank you' and a handover in a public campus place.",
      "Last to leave the security cabin wins… your own lost bottle. Go check the Found board.",
    ],
  },
  {
    keywords: ["taylor swift", "swiftie", "swifties"],
    response: [
      "Taylor Swift writes a whole album about every loss. If you lose your calculator, please skip the breakup album and just post it on the board.",
      "Shake it off, then search the Browse board. Your earphones are probably at the library circulation desk, not in a stadium tour.",
    ],
  },
  {
    keywords: ["trump", "donald trump"],
    response: [
      "Trump would call your lost charger 'the best charger, a tremendous charger, everybody's talking about it.' Post it on the board anyway.",
      "Make Lost Items Great Again — one post at a time. Check the Found board first.",
    ],
  },
  {
    keywords: ["kim jong un", "kim jong"],
    response: [
      "Even Kim Jong Un can't make your lost bottle reappear by decree. Post it on the board like a free citizen.",
    ],
  },
  {
    keywords: ["rahul gandhi", "bharat jodo"],
    response: [
      "The Bharat Jodo Yatra covered 4,000 km on foot. Retracing your steps from the canteen to the library is about 200 metres. Start walking.",
      "Politics aside, no lost item has ever come back through a press conference. Post it on the board.",
    ],
  },
  {
    keywords: ["kejriwal", "arvind kejriwal"],
    response: [
      "If you lost a muffler, check the Found board — though in Mumbai weather you probably didn't need it anyway.",
      "Aam aadmi tip: lost things on campus usually end up at the Main Security Cabin. Check there first.",
    ],
  },
  {
    keywords: ["bill gates", "mark zuckerberg", "zuckerberg", "sundar pichai", "jeff bezos", "bezos"],
    response: [
      "Tech billionaires don't come to SFIT looking for lost earphones. You, however, can — and the Browse board is free.",
      "Big Tech knows where you are at all times. CampusFind doesn't track you, so you'll have to post your lost item yourself.",
    ],
  },
  {
    keywords: ["epstein", "jeffrey epstein", "epstein island", "didnt kill himself", "flight logs"],
    response: [
      "Searching for Epstein flight logs on a local campus lost-and-found system? Your search history is an absolute biological biohazard. Close this browser and go talk to an academic counselor immediately.",
      "There are no private islands in Borivali or anywhere near SFIT. You have an engineering viva next week. The only conspiracy here is how you managed to survive till this semester without opening a single reference book.",
      "Epstein didn't recover your lost Casio calculator, and neither will this dark web humor. Clean up your digital footprint before the placement cell sees this.",
    ],
  },
  {
    keywords: ["ishowmeat", "ishowspeed meat", "speed meat", "ishowspeed"],
    response: [
      "Bro is referencing IShowSpeed flash streams on an institutional portal. The level of brain decay is truly catastrophic. Go splash ice water on your face, touch grass outside the college gate, and seek urgent rehabilitation.",
      "Your dopamine receptors are completely fried. Instead of watching leaked stream clips and reciting internet sludge, how about you show some attendance in your morning lectures?",
      "Barking at the screen like Speed won't recover your lost umbrella. Log off, step into the sunlight, and rethink every decision that brought you to this moment.",
    ],
  },
  {
    keywords: ["moye moye", "skibidi", "sigma", "mewing", "rizz", "gyatt", "brainrot"],
    response: [
      "Brainrot levels reaching critical thresholds. The only thing getting 'mewed' here is your GPA if you don't find your lost notes and start studying.",
      "Zero rizz, zero attendance, negative GPA, and now wasting your finite youth reciting brainrot to a lost-and-found bot. Your ancestors are weeping.",
      "Moye Moye will be the exact background music playing when your term work gets rejected on final submission day. Go write your journal.",
    ],
  },

  // ─── Direct Heckling & Classic Trolls ───
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
      "Why do computer engineers leave their water bottles in the lab? Because they forgot to implement a garbage collector.",
    ],
  },
  {
    keywords: [
      "fuck you", "bitch", "asshole", "bastard", "madarchod", "bhenchod",
      "chutiya", "gandu", "bc", "mc", "bkc", "bhosdike", "laude", "lodu",
      "harami", "kaminey", "randi", "saale", "bhosda"
    ],
    response: [
      "Breathtaking vocabulary. Did your parents pay lakhs in engineering tuition fees just for you to abuse an open-source JavaScript array on a college lost-and-found portal? The sheer embarrassment your family would feel looking at this screen right now is astronomical.",
      "Throwing around street abuses at a computer program? You are sitting in an engineering college, yet your mental age hasn't crossed standard six. Close the tab, wash your mouth, and apologize to whoever had the misfortune of funding your semester fees.",
      "Imagine typing 'BC' and 'MC' into an automated FAQ widget and thinking you did something revolutionary. Your academic record is in shambles, your internal marks are nonexistent, and your social skills are sub-zero. Seek psychological help.",
      "Aise sanskaar leke engineering complete karoge? In your upcoming campus placements, when they ask for interpersonal communication skills, make sure you show them this exact screen so they can reject you on the spot.",
      "Your upbringing and vocabulary are currently competing to see which one can hit rock bottom faster. The database logged your session; go reflect on the disappointment you are actively generating.",
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
    response: "Hall tickets are high-security exam documents. Lost yours? Go straight to the Exam Control Room on the 1st floor for a duplicate. Found one? DO NOT post it here — hand it to the Exam Control Room or the main administrative office so the student can still sit the exam.",
    lost: "Don't wait on the board — go straight to the Exam Control Room on the 1st floor. They can issue a duplicate hall ticket so you can still sit the exam. Also ask at the Main Security Cabin in case someone has already handed it in.",
    found: "Hall tickets are high-security exam documents. DO NOT post it here or leave it unattended — hand it directly to the Exam Control Room on the 1st floor or the main administrative office so the student can sit for their exam.",
  },
  {
    category: "Exams & Academics",
    keywords: ["calculator", "casio", "scientific calculator", "fx991", "fx82", "calc"],
    response: "Calculators are the #1 most frequently lost item during exam months. Always give the exact model (e.g. Casio fx-991EX ClassWiz vs fx-991ES Plus). The owner should be able to name the initials, stickers, or writing inside the sliding cover.",
    lost: "Calculators are the #1 most lost item in exam months, so check the exam hall or classroom you last used, then search 'calculator' on the Browse board. When you post or claim, give the exact model (e.g. Casio fx-991EX ClassWiz vs fx-991ES Plus) and mention any initials, stickers or writing inside the sliding cover — that's your proof.",
    found: "Post it with the exact model (e.g. Casio fx-991EX ClassWiz vs fx-991ES Plus). Check for initials, stickers or writing inside the sliding cover, but keep them out of the photo — ask the claimant to describe them instead.",
  },
  {
    category: "Exams & Academics",
    keywords: ["journal", "lab manual", "practical file", "submission book", "assignment file"],
    response: "Lab manuals and signed journals are usually left behind in computer labs, CAD labs, or the xerox shop. The front cover index page normally has the student's roll number, branch, and professor signatures.",
    lost: "Signed journals usually turn up where you last used them — the computer or CAD lab, or the xerox shop. Ask the lab attendant first, then post it as Lost with your roll number and branch so a finder can match it.",
    found: "Check the front cover index page for the student's name, roll number, and branch, then post it as Found — or hand it to that lab's attendant. Keep the roll number out of the photo.",
  },
  {
    category: "Exams & Academics",
    keywords: ["drafter", "mini drafter", "engineering drawing", "compass box", "drawing sheet"],
    response: "Mini drafters and drawing boards are almost always left in the Drawing Hall or Mechanical CAD labs. The brand and whether the protractor scale is intact help match them to the owner.",
    lost: "Mini drafters almost always stay behind in the Drawing Hall or the Mechanical CAD lab. Check there first, then post it as Lost with the brand and any name or mark scratched on it.",
    found: "Note the brand and whether the protractor scale is intact, then post it as Found or leave it with the Drawing Hall staff and choose 'Left at a desk'.",
  },
  {
    category: "Exams & Academics",
    keywords: ["pendrive", "usb", "flash drive", "hard drive", "ssd", "final year project"],
    response: "SECURITY WARNING: Never plug an unknown USB drive or external SSD into your laptop — it can carry malware. Post a photo of the outside (colour, brand, keychain) and hand it to the main security desk or administrative office.",
    lost: "Check the computer lab you last used — attendants collect pendrives at the end of practicals. Then post it as Lost with the brand, colour, and keychain. Don't describe the files on it publicly; save one detail for your claim.",
    found: "SECURITY WARNING: Never plug an unknown USB drive or external SSD into your laptop — it can carry malware. Post a photo of the outside (colour, brand, keychain) and hand it to the main security desk or administrative office.",
  },
  {
    category: "Exams & Academics",
    keywords: ["id card", "college id", "smart card", "rfid", "lanyard"],
    response: "ID cards are among the most commonly handed-in items. Lost one? Search 'ID card' on the Browse board and ask at the Main Security Cabin. Found one? Blur the barcode and roll number before posting a photo, or drop it at the security cabin.",
    lost: "First, search 'ID card' on the Browse board and ask at the Main Security Cabin — ID cards are among the most commonly handed-in items. If it doesn't turn up in a few days, report it at the administrative office counter: you'll fill out a duplicate ID card requisition form and pay the replacement fee.",
    found: "If you found an SFIT ID card, blur the student's barcode and roll number before uploading a photo. If the name is clearly legible, post it as Found with just the name, or drop it at the security cabin.",
  },
  {
    category: "Exams & Academics",
    keywords: [
      "replace id", "replace my id", "lost my id card", "lost id card", "lost my id", "id card fine",
      "duplicate id", "id card replacement", "new id card",
    ],
    response: "First, search 'ID card' on the Browse board and ask at the Main Security Cabin — ID cards are among the most commonly handed-in items. If it doesn't turn up in a few days, report it at the administrative office counter: you'll fill out a duplicate ID card requisition form and pay the replacement fee.",
  },
  {
    category: "Exams & Academics",
    keywords: ["library book", "reference book", "borrowed book", "book return"],
    response: "Books stamped with the SFIT Central Library seal belong at the library circulation desk. The librarian can scan the barcode and sort out the borrower's account.",
    lost: "Tell the library circulation desk straight away — they can check whether someone has already returned it and explain the fine or replacement rules. Post it as Lost too, in case someone picked it up.",
    found: "If it's stamped with the SFIT Central Library seal, just return it to the library circulation desk. The librarian will scan the barcode and clear the student's account without any drama.",
  },

  // ─── Electronics & Gadgets ───
  {
    category: "Electronics",
    keywords: ["airpods", "earbuds", "tws", "wireless buds", "galaxy buds", "earphones"],
    response: "Wireless earbuds are easy to mix up. The owner should be able to describe the case colour, protective cover, or LED colour, or show the buds in their Bluetooth history. Finders shouldn't pair them with their own phone.",
    lost: "Open Find My (iPhone) or Find My Device (Android) — it can show where your earbuds last connected. Then search the Browse board. When you claim, mention the case colour, cover, and any scratches, or show them in your phone's Bluetooth history.",
    found: "Don't pair them with your phone. Post them as Found with the case colour, and let the owner prove it by describing the case cover or showing the buds in their Bluetooth history.",
  },
  {
    category: "Electronics",
    keywords: ["laptop", "macbook", "charger", "type c charger", "magsafe", "power adapter"],
    response: "65W/100W laptop chargers are often left plugged into classroom and computer lab floor sockets. The brand and wattage are the best way to match one to its owner.",
    lost: "Chargers usually stay plugged into the classroom or lab floor socket you used, so check there first. Then search the Browse board and post it as Lost with the brand and wattage (e.g. 65W USB-C). If it's a whole laptop, tell campus security straight away too.",
    found: "Unplug it, post it as Found with the brand and wattage, and hand it to the Main Security Cabin or administrative office. For a laptop, go to security first.",
  },
  {
    category: "Electronics",
    keywords: ["phone", "smartphone", "iphone", "samsung", "oneplus", "screen lock"],
    response: "Lost a phone? Use Find My (iPhone) or Find My Device (Android) to ring it or see its location, then check the Main Security Cabin. Found one? Never hand it over without the claimant unlocking it or describing the lock screen and case in front of you.",
    lost: "From a friend's phone or laptop, open Find My (icloud.com/find for iPhone) or Find My Device (google.com/android/find) to ring it or see where it is. Then check the Main Security Cabin and post it as Lost. Don't put your phone number in the post — claims on CampusFind stay private.",
    found: "NEVER hand a found phone over without checking it's theirs: ask them to describe the lock screen wallpaper and case, or unlock it with their PIN or fingerprint in front of you. If you'd rather not deal with it, leave it at the Main Security Cabin.",
  },
  {
    category: "Electronics",
    keywords: ["powerbank", "portable charger", "power bank", "mi power bank"],
    response: "Powerbanks are often left in library cubicles or on canteen tables. The brand, colour, and capacity (e.g. 10,000mAh vs 20,000mAh) help match them to the owner.",
    lost: "Powerbanks are usually left in library cubicles or on canteen tables — check there first. Then post it as Lost with the brand, colour, and capacity (e.g. 10,000mAh).",
    found: "Post it as Found with the brand, colour, and approximate capacity (e.g. 10,000mAh vs 20,000mAh), or hand it to the security cabin.",
  },
  {
    category: "Electronics",
    keywords: ["smartwatch", "apple watch", "fitness band", "smart watch", "boat watch"],
    response: "Smartwatches can be identified by their band colour, strap material (silicone, metal mesh, leather), and the watch face on the screen.",
    lost: "If it's paired to your phone, check the watch app or Find My — it may show where it last connected. Then post it as Lost with the band colour and strap material, and keep the watch face as your proof for the claim.",
    found: "Post it as Found with the band colour and strap material. Don't show the watch face in the photo — ask the claimant to describe it.",
  },

  // ─── Personal Valuables & Money ───
  {
    category: "Valuables",
    keywords: ["wallet", "purse", "cash", "money", "currency", "credit card", "debit card"],
    response: "Wallets with cash or bank cards should go to the Head of Campus Security. When claiming a wallet, the owner must state what cards, receipts, or notes are inside.",
    lost: "First, block your bank cards from your banking app — it takes a minute and protects your money. Then check the Main Security Cabin (wallets usually get handed in there) and search 'wallet' on the Browse board. When you post or claim, describe what's inside — cards, receipts, notes — that's your proof.",
    found: "If it has cash or bank cards, turn it in to the Head of Campus Security right away, or post it as Found without showing what's inside. Whoever claims it must say which cards, receipts, or notes are in it.",
  },
  {
    category: "Valuables",
    keywords: ["keys", "bike key", "car key", "activa key", "scooty key", "locker key"],
    response: "Bike keys are commonly dropped in the two-wheeler parking lot or on canteen benches. The vehicle brand (Honda, Yamaha, Royal Enfield) and any keychain help confirm the owner.",
    lost: "Bike keys are commonly dropped in the two-wheeler parking lot or on canteen benches. Check with the guards at the main gate, then post it as Lost with your vehicle brand (Honda, Yamaha, Royal Enfield) and keychain.",
    found: "Post them as Found with the vehicle brand on the key, or hand them to the guards at the main gate. Keep the keychain out of the photo so the owner can describe it as proof.",
  },
  {
    category: "Valuables",
    keywords: ["glasses", "spectacles", "specs", "sunglasses", "contact lens"],
    response: "Prescription spectacles matter a lot to their owner. The frame colour, shape (rectangular, aviator, round), and whether there was a case help match them.",
    lost: "Retrace your last few classrooms and the library — glasses usually get left on desks. Then post them as Lost with the frame colour, shape (rectangular, aviator, round), and whether they were in a case.",
    found: "Prescription glasses matter a lot to their owner, so post them quickly. Note the frame colour, shape, and whether they were in a case.",
  },
  {
    category: "Valuables",
    keywords: ["ring", "chain", "bracelet", "jewelry", "jewellery", "gold", "silver"],
    response: "Valuable jewellery shouldn't be shown in detail publicly. The owner proves it by describing the engraving, metal, and design in their claim note.",
    lost: "Post it as Lost, but keep the unique details (engraving, hallmark, exact design) out of the post — those are your proof when you claim. For anything gold or silver, tell campus security too.",
    found: "Don't post close-up photos that show engravings or hallmarks. Ask the claimant to describe the engraving, metal, and design in their claim note — or hand it to campus security.",
  },

  // ─── Everyday Essentials & Seasonal ───
  {
    category: "Everyday Items",
    keywords: ["umbrella", "raincoat", "monsoon", "chhaata"],
    response: "During Mumbai monsoons, umbrellas multiply in the library entrance stands. To avoid mix-ups, go by unique handles, brand tags, or prints rather than plain black umbrellas.",
    lost: "During Mumbai monsoons, umbrellas multiply in the library entrance stands. Check there and at your classroom door, and look for your handle, brand tag, or print — plain black ones all look alike. Post it as Lost with anything distinctive.",
    found: "Post it as Found with a photo of the handle or print — plain black umbrellas all look alike, so ask the claimant to describe it.",
  },
  {
    category: "Everyday Items",
    keywords: ["water bottle", "flask", "bottle", "milton", "tupperware", "thermos"],
    response: "Water bottles left in classrooms at the end of the day are collected by cleaning staff. The colour, brand, and stickers help match them.",
    lost: "Bottles left in classrooms get collected by the cleaning staff at the end of the day — ask them or the Main Security Cabin. Then post it as Lost with the colour, brand, and any stickers.",
    found: "Post it as Found with the colour, brand, and stickers before it gets cleared into the staff lost corner at the end of the day.",
  },
  {
    category: "Everyday Items",
    keywords: ["bag", "backpack", "tote bag", "wildcraft", "skybags", "safari"],
    response: "For an unattended backpack, check with students nearby before moving it, and only look at outside tags or the top zipper for a name.",
    lost: "Check the last classroom, lab, or canteen table you used, then the Main Security Cabin. Post it as Lost with the brand and colour, and keep one thing that's inside as your proof for the claim.",
    found: "Check with students sitting nearby before moving it. Don't dig through it — only look at outside tags or the top zipper for a name, then post it as Found or hand it to security.",
  },
  {
    category: "Everyday Items",
    keywords: ["jacket", "hoodie", "sweater", "apron", "workshop apron", "coat"],
    response: "Workshop aprons and lab jackets are often left draped over chairs in the 1st floor workshops and AC computer labs. Size, brand, and any embroidered name help match them.",
    lost: "Jackets and workshop aprons usually stay draped over chairs in the 1st floor workshops and AC computer labs. Check there, then post it as Lost with the size, brand, and any embroidered name.",
    found: "Post it as Found with the size and brand. If there's an embroidered name, mention just the name — or leave it with the lab attendant.",
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
    keywords: ["computer lab", "cad lab", "cad cam", "programming lab", "it lab"],
    response: "Items forgotten in computer or CAD labs (pendrives, mice, notebooks) are collected at the end of practical batches. Check with the lab attendants or visit the main security desk.",
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
    response: "If you found an item and didn't want to hold onto it, mark 'Left at a desk' when posting and name the exact office or counter (e.g. 'Main Gate security cabin' or 'Library circulation desk'). The owner collects it there directly — no claim with you needed.",
  },
  {
    category: "Claim Process",
    keywords: ["mark returned", "resolve post", "completed handover", "finished"],
    response: "Once the item is back with its owner, go to Dashboard → Posted and tap 'Mark returned'. The listing stays on Browse tagged Returned (so people stop asking), any pending claims are closed automatically, and you can reopen it if the handover falls through.",
  },
  {
    category: "Claim Process",
    keywords: ["delete listing", "delete my listing", "delete post", "remove post", "cancel post", "take down"],
    response: "You can delete your listing any time from Dashboard → Posted → Delete. It and its photos come off the board immediately, anyone with a pending claim is notified, and the photos are permanently erased within 30 days.",
  },
  {
    category: "Claim Process",
    keywords: ["edit listing", "edit my listing", "edit post", "edit my post", "modify post", "modify my post", "change listing", "update listing", "typo"],
    response: "There's no edit button yet. To fix a mistake, delete the listing from Dashboard → Posted and post it again. Anyone with a pending claim is notified when you delete, so do it before people start claiming.",
  },
  {
    category: "Claim Process",
    keywords: ["how to post", "post an item", "report lost", "report found", "report an item", "create listing", "new listing"],
    response: "Sign in with your SFIT Google account, tap 'Report an item' (or 'I lost something' / 'I found something' on the homepage), and fill in the title, place, and a photo if you have one. Found something and handed it in? Choose 'Left at a desk' and name the desk.",
  },
  {
    category: "Claim Process",
    keywords: ["possible match", "match alert", "similar item", "matching item"],
    response: "When someone posts a found item in the same category with similar title words to your lost listing (or the other way round), you get a 'Possible match' alert. Open it and tap 'This is mine' if it's yours.",
  },

  // ─── Account, Security & Privacy ───
  {
    category: "Account & Security",
    keywords: ["who can use", "eligibility", "gmail", "outsiders", "non sfit"],
    response: "CampusFind is locked to official SFIT Google accounts: @student.sfit.ac.in for students, and @sfit.ac.in for faculty and staff. Personal Gmail, Yahoo, or other outside addresses are blocked at sign-in. Anyone can browse the board without signing in.",
  },
  {
    category: "Account & Security",
    keywords: ["sign in", "signin", "login", "log in", "cant login", "login error", "google account"],
    response: "Sign-in uses Google. If it fails, make sure you picked your @student.sfit.ac.in (or @sfit.ac.in) account in the Google chooser, not a personal Gmail. Still stuck? Try a normal (non-incognito) window with third-party sign-in prompts allowed.",
  },
  {
    category: "Account & Security",
    keywords: ["privacy", "phone number", "personal email", "data safe"],
    response: "Privacy by Default: Public listings NEVER show your personal phone number or email address. Only your display name and item details are shown. All claim discussions stay 100% private between the poster and claimant.",
  },
  {
    category: "Account & Security",
    keywords: ["notifications", "email alert", "bell icon", "unread"],
    response: "You get an in-app alert (the bell badge plus Dashboard → Alerts) whenever someone claims your item, accepts or declines your claim, or updates a handover. Turn on desktop notifications in the Alerts tab for a system banner while the tab is in the background. When CampusFind email is enabled, a copy also goes to your SFIT inbox.",
  },
  {
    category: "Account & Security",
    keywords: ["rate limit", "posting limit", "spam limit", "too many posts", "limit"],
    response: "To keep the board spam-free, each account can post up to 5 listings per hour and send up to 15 claims per 24 hours. Each listing takes up to 5 photos, and photo storage is capped at 30 images (50 MB) per account.",
  },
  {
    category: "Account & Security",
    keywords: ["free", "cost", "pricing", "subscription", "charges"],
    response: "CampusFind is 100% free forever ($0.00). It is an open-source student welfare initiative built on generous free cloud tiers. No ads, no paywalls, and no monetization.",
  },
  {
    category: "Account & Security",
    keywords: ["admin", "moderator", "report user", "harassment"],
    response: "If anyone attempts harassment, false claims, or abusive behavior, decline the claim and report it to campus security or the student disciplinary committee. The CampusFind maintainer can remove accounts that abuse the board.",
  },
  {
    category: "Account & Security",
    keywords: ["tech stack", "technologies used", "frameworks", "source code", "open source stack"],
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
 * Normalizes text for consistent tokenization and keyword matching.
 * Apostrophes are dropped ("can't" → "cant") and underscores count as spaces.
 */
function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\w\s]|_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-word phrase match: "modi" matches "narendra modi" but not "modify". */
function hasPhrase(clean: string, phrase: string): boolean {
  return ` ${clean} `.includes(` ${phrase} `);
}

/** Light plural folding so "umbrellas" finds "umbrella" and "keys" finds "key". */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(ches|shes|sses|xes)$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function stemPhrase(clean: string): string {
  return clean.split(" ").map(stem).join(" ");
}

/** Words too common to count as evidence for any one campus intent. */
const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "his", "her", "him", "she", "they", "their", "them", "our",
  "was", "are", "were", "has", "have", "had", "can", "cant", "could", "would", "should", "will",
  "what", "where", "when", "why", "how", "who", "which", "this", "that", "with", "from", "into",
  "lost", "lose", "found", "find", "some", "any", "one", "there", "here", "about", "just",
  "please", "help", "want", "need", "got", "get", "did", "does", "not", "yes", "today", "yesterday",
]);

function matchesIntent(clean: string, intent: FAQIntent): boolean {
  if (intent.exact?.some((phrase) => clean === normalizeQuery(phrase))) return true;
  return intent.keywords.some((phrase) => hasPhrase(clean, normalizeQuery(phrase)));
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

// ─── "Lost my <thing>" sentence-shape detection ───

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const alternation = (words: string[]) =>
  [...words].sort((a, b) => b.length - a.length).map(escapeRegex).join("|");

const LOSS_VERBS = [
  "lost", "lose", "loses", "losing", "missing", "misplaced", "misplace", "dropped", "forgot",
  "forgotten", "stolen", "find", "cant find", "cannot find", "couldnt find", "can not find",
  "where is", "wheres", "where are", "left",
];
const FOUND_VERBS = ["found", "picked up", "spotted"];
const OWNER_WORDS = [
  "my", "his", "her", "their", "our", "your", "ur", "the", "a", "an", "someones", "somebodys",
  "some", "this", "that", "mine", "all",
];
const FILLER_WORDS = [
  "entire", "whole", "only", "own", "precious", "poor", "little", "tiny", "small", "big", "last",
  "remaining", "damn", "fucking", "freaking", "bloody", "actual", "beloved", "sweet", "all", "every",
];

const OWNER = `(?:(${alternation(OWNER_WORDS)})\\s+)?`;
const FILLERS = `(?:(?:${alternation(FILLER_WORDS)})\\s+){0,2}`;

/** Finds "lost his X", "where is my X", "my X is missing", "found a X"… Returns the owner word on a hit. */
function findLossShape(clean: string, targets: string[]): { kind: "lost" | "found"; owner?: string } | null {
  const target = `(?:${alternation(targets)})`;
  const end = "(?=\\s|$)";

  const active = (verbs: string[]) =>
    new RegExp(`(?:^|\\s)(?:${alternation(verbs)})\\s+${OWNER}${FILLERS}${target}${end}`);
  // Passive needs an auxiliary for lost/found so "my girlfriend lost her phone" is not a hit.
  const passive = (states: string[], bare: string[]) =>
    new RegExp(
      `(?:^|\\s)${OWNER}${FILLERS}${target}\\s+(?:(?:(?:is|are|was|were|has|have|had|got|been|went)\\s+){1,2}(?:${alternation(states)})|(?:${alternation(bare)}))${end}`,
    );

  const lostActive = clean.match(active(LOSS_VERBS));
  if (lostActive) return { kind: "lost", owner: lostActive[1] };
  const lostPassive = clean.match(passive(["missing", "lost", "gone", "stolen", "misplaced"], ["missing", "gone"]));
  if (lostPassive) return { kind: "lost", owner: lostPassive[1] };

  const foundActive = clean.match(active(FOUND_VERBS));
  if (foundActive) return { kind: "found", owner: foundActive[1] };
  const foundPassive = clean.match(passive(["found"], []));
  if (foundPassive) return { kind: "found", owner: foundPassive[1] };

  return null;
}

function fillPronouns(template: string, owner?: string): string {
  const forms =
    owner === "my" || owner === "mine" || owner === "your" || owner === "ur"
      ? { who: "you", their: "your", them: "you" }
      : owner === "his"
        ? { who: "he", their: "his", them: "him" }
        : owner === "her"
          ? { who: "she", their: "her", them: "her" }
          : { who: "they", their: "their", them: "them" };

  return template
    .replace(/\{Who\}/g, forms.who.charAt(0).toUpperCase() + forms.who.slice(1))
    .replace(/\{who\}/g, forms.who)
    .replace(/\{their\}/g, forms.their)
    .replace(/\{them\}/g, forms.them);
}

function matchLossJoke(clean: string): string | null {
  for (const intent of LOSS_JOKE_INTENTS) {
    const shape = findLossShape(clean, intent.targets.map(normalizeQuery));
    if (!shape) continue;
    const pool = shape.kind === "found" && intent.found ? intent.found : intent.lost;
    return fillPronouns(resolveResponse(pool), shape.owner);
  }
  return null;
}

// ─── Fallback that echoes the item back ───

/** "where is …" is usually a location question, and "find"/"left" are too vague to echo back. */
const FALLBACK_LOSS_VERBS = LOSS_VERBS.filter(
  (verb) => !["find", "left", "where is", "wheres", "where are"].includes(verb),
);

const TRAILING_CONTEXT = new Set([
  "in", "at", "near", "on", "from", "during", "yesterday", "today", "while", "when", "inside",
  "outside", "behind", "under", "by", "and", "after", "before", "around", "somewhere", "last", "this",
]);

function extractItemPhrase(clean: string, verbs: string[]): string | null {
  const match = clean.match(
    new RegExp(`(?:^|\\s)(?:${alternation(verbs)})\\s+${OWNER}((?:[a-z0-9]+\\s*){1,6})`),
  );
  if (!match) return null;
  const words: string[] = [];
  for (const word of match[2].trim().split(" ")) {
    if (words.length === 0 && OWNER_WORDS.includes(word)) continue;
    if (TRAILING_CONTEXT.has(word) || words.length === 3) break;
    words.push(word);
  }
  const phrase = words.join(" ");
  return phrase.length >= 2 && phrase.length <= 30 ? phrase : null;
}

// ─── Names Foggy doesn't know ───
// Names that already have a joke (Ken, Kiran, Puneet, Modi…) keep their joke. Any other
// name gets a clear "I don't know this person", plus whatever the question still needs.

const SMALL_TALK_INTENTS: FAQIntent[] = [
  {
    keywords: [],
    exact: ["hi", "hii", "hiii", "hello", "hey", "heyy", "yo", "sup", "namaste", "good morning", "good afternoon", "good evening", "hi foggy", "hello foggy", "hey foggy"],
    response: "Hey! I'm Foggy, CampusFind's help desk. Ask me about a lost item, how claims work, or where to hand something in.",
  },
  {
    keywords: [],
    exact: ["thanks", "thank you", "thanks foggy", "thank you foggy", "thx", "ty", "tysm"],
    response: "Anytime! Hope it turns up soon.",
  },
  {
    keywords: [],
    exact: ["who are you", "what are you", "who is foggy", "what is foggy", "whos foggy"],
    response: "I'm Foggy, CampusFind's built-in help desk. I know the claim rules, campus hand-in spots, and what to do with most lost or found items. I don't know people, and I can't see anyone's listings or claims.",
  },
];

/** Words that can sit where a name would, but aren't names. */
const NOT_A_NAME = new Set([
  "i", "im", "ive", "id", "me", "my", "mine", "myself", "we", "our", "us", "you", "u", "ur", "your",
  "yours", "he", "hes", "him", "his", "she", "shes", "her", "hers", "they", "theyre", "them", "their",
  "it", "its", "this", "that", "these", "those", "there", "here", "a", "an", "the", "some", "one",
  "someone", "somebody", "anyone", "anybody", "everyone", "everybody", "nobody", "no", "any", "every",
  "each", "all", "both", "person", "people", "guy", "guys", "girl", "girls", "boy", "boys", "man", "men",
  "woman", "women", "lady", "dude", "bro", "bruh", "bhai", "yaar", "friend", "friends", "roommate",
  "roomie", "classmate", "classmates", "bestie", "buddy", "mate", "senior", "seniors", "junior",
  "juniors", "cousin", "brother", "sister", "sis", "kid", "student", "students", "teacher", "teachers",
  "prof", "professor", "sir", "maam", "madam", "miss", "mam", "uncle", "aunty", "aunt", "mom", "mother",
  "dad", "father", "mummy", "papa", "girlfriend", "boyfriend", "crush", "lol", "lmao", "omg", "hey",
  "hi", "hello", "yo", "ok", "okay", "so", "and", "or", "but", "also", "just", "then", "apparently",
  "basically", "literally", "actually", "really", "honestly", "seriously", "maybe", "please", "pls",
  "plz", "help", "damn", "today", "yesterday", "tomorrow", "tonight", "morning", "evening", "again",
  "already", "finally", "from", "in", "of", "at", "on", "to", "with", "near", "class", "classes",
  "college", "campus", "sfit", "branch", "div", "division", "batch", "year", "comps", "computer",
  "extc", "entc", "mech", "mechanical", "civil", "aids", "aiml", "ds", "iot", "cse", "fe", "se", "te",
  "be", "fy", "sy", "ty", "first", "second", "third", "final", "lab", "room", "floor", "staff", "hod",
  "principal", "dean", "guard", "watchman", "peon", "office", "website", "site", "app", "portal",
  "campusfind", "foggy", "bot", "item", "items", "thing", "things", "stuff", "something", "anything",
  "nothing", "everything", "what", "which", "who", "whom", "whose", "why", "how", "when", "where", "if",
  "not", "never", "always", "still", "even", "only", "very", "too", "much", "many", "lot", "lots", "new",
  "old", "good", "bad", "big", "small", "last", "next", "other", "another", "same", "own", "think",
  "guess", "heard", "hear", "know", "knew", "feel", "believe", "mean", "saw", "see", "thanks", "thank",
  "ya", "yes", "yeah", "nah", "nope", "hmm", "wait", "sorry", "bye", "kya", "kaun", "hai", "ki", "ka",
  "ke", "ne", "ko", "se", "aur", "toh", "bhi", "mera", "meri", "mere", "uska", "uski", "apna",
]);

/** Verbs that end a "<name> lost/found/took…" subject. */
const PERSON_VERBS = new Set([
  "lost", "loses", "lose", "losing", "found", "finds", "forgot", "forgets", "dropped", "drops", "left",
  "misplaced", "stole", "steals", "took", "takes", "borrowed", "has", "had", "hasnt", "wants", "needs",
  "said", "says", "told", "tells", "likes", "loves", "hates", "thinks", "keeps", "kept", "got", "gets",
  "doesnt", "didnt", "did", "does", "will", "wont", "went", "came", "broke", "owes", "posted", "claimed",
  "asked", "called",
]);
const BE_VERBS = new Set(["is", "was", "are", "were", "isnt", "wasnt"]);

const INSULT_WORDS = [
  "gay", "lesbian", "slut", "whore", "randi", "chutiya", "gandu", "bitch", "virgin", "simp", "ugly",
  "fat", "hakla", "nalla", "chapri", "characterless", "hoe", "thot", "pervert", "creep", "retard",
  "retarded", "psycho", "pagal", "loser", "idiot", "dumb", "stupid", "mental", "bastard", "kamina",
  "kaminey", "harami", "ullu", "gadha", "bewakoof", "druggie", "cheater", "liar", "kutta", "kutti",
  "bhosdike", "madarchod", "bhenchod", "lodu", "laude", "horny",
];
const INSULT = `(?:${alternation(INSULT_WORDS)})`;
const INSULT_FILLER = "(?:(?:a|an|so|such|very|total|complete|full|real|ek|ekdum|bada|badi|pura|big|huge|the)\\s+){0,2}";

/** Single words that already trigger a joke on their own (ken, kiran, puneet, srk, modi…). */
const KNOWN_NAME_WORDS = new Set(
  TROLL_INTENTS.flatMap((intent) => [...intent.keywords, ...(intent.exact ?? [])])
    .map(normalizeQuery)
    .filter((phrase) => !phrase.includes(" ")),
);
const CAMPUS_VOCABULARY = new Set(
  CAMPUS_INTENTS.flatMap((intent) => intent.keywords).flatMap((phrase) => stemPhrase(normalizeQuery(phrase)).split(" ")),
);
const JOKE_WORDS = new Set(
  [...LOSS_JOKE_INTENTS.flatMap((intent) => intent.targets), ...VULGAR_ANATOMY_INTENT.keywords].flatMap((phrase) =>
    normalizeQuery(phrase).split(" "),
  ),
);

function isNameLike(word: string): boolean {
  return (
    /^[a-z]{2,}$/.test(word) &&
    !NOT_A_NAME.has(word) &&
    !STOPWORDS.has(word) &&
    !KNOWN_NAME_WORDS.has(word) &&
    !CAMPUS_VOCABULARY.has(stem(word)) &&
    !JOKE_WORDS.has(word) &&
    !PERSON_VERBS.has(word) &&
    !BE_VERBS.has(word) &&
    !INSULT_WORDS.includes(word)
  );
}

const displayName = (words: string[]) =>
  words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

/** First run of name-like words (up to 3), skipping words right after "my/the/a…" ("my tiffin" is an item). */
function nameRun(words: string[], allWords: string[], offset = 0): string[] {
  const run: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const previous = allWords[offset + i - 1];
    const candidate = isNameLike(words[i]) && !(previous && OWNER_WORDS.includes(previous));
    if (candidate) {
      run.push(words[i]);
      if (run.length === 3) break;
    } else if (run.length > 0) {
      break;
    }
  }
  return run;
}

interface UnknownPerson {
  name: string;
  /** false for bare one- or two-word queries, which could also be an item nobody has a guide for */
  confident: boolean;
  insulted: boolean;
  asksWho: boolean;
}

function findUnknownPerson(rawQuery: string, clean: string): UnknownPerson | null {
  const words = clean.split(" ");

  // "is priya gay", "rahul is a creep", "rahul gay hai"
  const insultBefore = clean.match(new RegExp(`^((?:[a-z]+\\s+){1,6}?)(?:is|was|are|were|seems|looks|acts|became|hai)\\s+${INSULT_FILLER}${INSULT}(?=\\s|$)`));
  const insultAfterIs = clean.match(new RegExp(`(?:^|\\s)is\\s+((?:[a-z]+\\s+){1,3}?)${INSULT_FILLER}${INSULT}(?=\\s|$)`));
  const insultHai = clean.match(new RegExp(`^((?:[a-z]+\\s+){1,4}?)${INSULT_FILLER}${INSULT}\\s+(?:hai|h|he)(?=\\s|$)`));
  for (const match of [insultBefore, insultAfterIs, insultHai]) {
    if (!match) continue;
    const subject = match[1].trim().split(" ");
    const run = nameRun(subject, subject);
    if (run.length > 0) return { name: displayName(run), confident: true, insulted: true, asksWho: false };
  }

  // "who is rahul", "do you know priya", "tell me about aditya"
  const who = clean.match(
    /(?:^|\s)(?:who is|whos|who s|do you know|does anyone know|anyone know|tell me about|have you seen|has anyone seen|anyone seen)\s+((?:[a-z]+\s*){1,3})/,
  );
  if (who) {
    const run = nameRun(who[1].trim().split(" "), []);
    if (run.length > 0) return { name: displayName(run), confident: true, insulted: false, asksWho: true };
  }

  // "where is rahul" (could also be a place Foggy doesn't know, so the reply hedges)
  const whereIs = clean.match(/^(?:where is|wheres|where can i find|where to find)\s+([a-z]+(?:\s+[a-z]+)?)$/);
  if (whereIs) {
    const run = nameRun(whereIs[1].split(" "), []);
    if (run.length > 0) return { name: displayName(run), confident: false, insulted: false, asksWho: false };
  }

  // "rahul's wallet" (typed with an apostrophe)
  for (const match of rawQuery.toLowerCase().matchAll(/([a-z]+)['’]s\b/g)) {
    if (isNameLike(match[1])) return { name: displayName([match[1]]), confident: true, insulted: false, asksWho: false };
  }

  // "rahuls wallet" (apostrophe skipped) — only when an item or joke word follows
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i];
    const base = word.slice(0, -1);
    const next = words[i + 1];
    if (
      word.length >= 4 &&
      word.endsWith("s") &&
      isNameLike(word) &&
      isNameLike(base) &&
      (CAMPUS_VOCABULARY.has(stem(next)) || JOKE_WORDS.has(next))
    ) {
      return { name: displayName([base]), confident: true, insulted: false, asksWho: false };
    }
  }

  // "rahul lost his wallet", "my friend aditya found…", "priya is missing"
  const verbAt = words.findIndex((word, i) => i > 0 && i <= 6 && (PERSON_VERBS.has(word) || BE_VERBS.has(word)));
  if (verbAt > 0) {
    const run = nameRun(words.slice(0, verbAt), words);
    if (run.length > 0) {
      return { name: displayName(run), confident: PERSON_VERBS.has(words[verbAt]), insulted: false, asksWho: false };
    }
  }

  return null;
}

/** Bare "rahul" / "priya sharma" / "aditya from comps" that matched nothing else. */
function findBareName(clean: string): UnknownPerson | null {
  const words = clean.split(" ");
  const run = nameRun(words, words).slice(0, 2);
  if (run.length === 0 || clean.indexOf(run.join(" ")) !== 0) return null;

  const rest = words.slice(run.length);
  const looksLikeAName = rest.length === 0 || (["from", "in", "of"].includes(rest[0]) && rest.length <= 3);
  return looksLikeAName ? { name: displayName(run), confident: false, insulted: false, asksWho: false } : null;
}

function refuseAboutUnknownPerson(person: UnknownPerson): string {
  return `I don't know anyone called ${person.name}, so I can't tell you anything about that. Foggy doesn't talk about people it doesn't know — ask about a lost item instead.`;
}

/**
 * Only for questions that are about the person and nothing else. Anything that mentions an
 * item ("rahul lost his tiffin box") returns null so the item gets answered straight.
 */
function answerAboutUnknownPerson(person: UnknownPerson, clean: string): string | null {
  if (extractItemPhrase(clean, FALLBACK_LOSS_VERBS) || extractItemPhrase(clean, FOUND_VERBS)) {
    return null;
  }

  const intro = `I don't know anyone called ${person.name}.`;

  if (person.asksWho) {
    return `${intro} Foggy doesn't look people up — CampusFind has no student directory, and the only names on the board are the ones people put on their own listings.`;
  }

  if (!person.confident) {
    return `${intro} Foggy only knows about lost items and how CampusFind works, and there's no student directory here. If "${person.name.toLowerCase()}" is an item or a place, try searching it on the Browse board.`;
  }

  return `${intro} Foggy only knows about lost items and how CampusFind works — ask about an item, a claim, or where to hand something in.`;
}

// ─── Lost or found? ───
// Only decides which advice to show. Foggy never grants or checks ownership — claims are
// verified separately (SFIT sign-in, proof note, poster accepts), enforced in the database.

type Perspective = "lost" | "found" | "recovered" | null;

const RECOVERED_REPLY =
  "Glad it turned up! If you'd posted it as Lost, open Dashboard → Posted and tap 'Mark returned' so people stop looking for it.";

function detectPerspective(clean: string): Perspective {
  const has = (pattern: string) => new RegExp(`(?:^|\\s)(?:${pattern})(?=\\s|$)`).test(clean);

  // "i found my wallet" — got it back
  if (has("(?:i|we) (?:finally |just |already )?found (?:my|our)")) return "recovered";
  // "haven't found my…", "can't find my…"
  if (has("(?:havent|hasnt|not|never|didnt|cant|couldnt|cannot|can not|unable to) (?:yet )?(?:found|find|locate)")) return "lost";
  // "someone found my wallet" — the asker is the one who lost it
  if (has("found (?:my|our)")) return "lost";
  if (has("lost|lose|loses|losing|missing|misplaced|misplace|dropped|forgot|forgotten|stolen|left (?:my|our|it)|where (?:is|are) (?:my|our)")) {
    return "lost";
  }
  if (has("found|find (?:a|an|some|someones)|picked up|spotted|came across|someone left|handed to me")) return "found";
  return null;
}

function answerFor(intent: FAQIntent, perspective: Perspective): string | string[] {
  if (perspective === "lost" && intent.lost) return intent.lost;
  if (perspective === "found" && intent.found) return intent.found;
  return intent.response;
}

/** Scores the campus knowledge base; returns null when nothing is confident enough. */
function matchCampusIntent(clean: string): FAQIntent | null {
  const stemmed = stemPhrase(clean);
  const queryTokens = Array.from(new Set(stemmed.split(" "))).filter(
    (t) => t.length > 2 && !STOPWORDS.has(t),
  );
  let bestIntent: FAQIntent | null = null;
  let highestScore = 0;

  for (const intent of CAMPUS_INTENTS) {
    let score = 0;

    for (const kw of intent.keywords) {
      const kwStemmed = stemPhrase(normalizeQuery(kw));

      // Whole-phrase match gives a large bonus
      if (hasPhrase(stemmed, kwStemmed)) {
        score += 40 + kwStemmed.length;
      }

      // Individual significant-token matches
      const kwTokens = kwStemmed.split(" ");
      for (const qt of queryTokens) {
        if (kwTokens.includes(qt)) {
          score += 10;
        }
      }
    }

    // "Lost my wallet in the canteen" is about the wallet, not the canteen.
    if (intent.category === "Campus Locations") {
      score *= 0.7;
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }

  return bestIntent && highestScore >= 15 ? bestIntent : null;
}

/**
 * Evaluates user input against the safety check, the "lost my ___" jokes,
 * the Troll Defense pipeline and the categorized Campus Knowledge Base.
 */
export function getSimulatedAIResponse(query: string): string {
  const clean = normalizeQuery(query);
  if (!clean) {
    return "I didn't catch that. Type a question about lost items, claim rules, or campus locations!";
  }

  // Tier 0: Safety always wins
  if (matchesIntent(clean, SAFETY_INTENT)) {
    return resolveResponse(SAFETY_INTENT.response);
  }

  const smallTalk = SMALL_TALK_INTENTS.find((intent) => matchesIntent(clean, intent));
  if (smallTalk) return resolveResponse(smallTalk.response);

  // Tier 1: "lost his private part", "lost my mind", "found my virginity"… — whoever it's about
  const lossJoke = matchLossJoke(clean);
  if (lossJoke) return lossJoke;

  if (matchesIntent(clean, VULGAR_ANATOMY_INTENT)) {
    return resolveResponse(VULGAR_ANATOMY_INTENT.response);
  }

  // Tier 2: Celebrities, memes & trolls (whole-word match)
  for (const troll of TROLL_INTENTS) {
    if (matchesIntent(clean, troll)) {
      return resolveResponse(troll.response);
    }
  }

  // An insult aimed at a classmate that no joke above covers ("priya is a slut")
  const person = findUnknownPerson(query, clean);
  if (person?.insulted) return refuseAboutUnknownPerson(person);

  const perspective = detectPerspective(clean);
  if (perspective === "recovered") return RECOVERED_REPLY;

  // Tier 3: Campus Knowledge Base — answered straight, even if a name is in the question,
  // from the side of whoever is asking (lost it vs found it)
  const campusIntent = matchCampusIntent(clean);
  if (campusIntent) {
    return resolveResponse(answerFor(campusIntent, perspective));
  }

  // "who is rahul", "do you know priya", or just "rahul"
  const unknownPerson = person ?? findBareName(clean);
  const personReply = unknownPerson && answerAboutUnknownPerson(unknownPerson, clean);
  if (personReply) return personReply;

  // Tier 4: Helpful fallback, naming the item when we can spot one
  const lostThing = extractItemPhrase(clean, FALLBACK_LOSS_VERBS);
  if (lostThing) {
    return `Foggy doesn't have a guide for "${lostThing}" yet. Search "${lostThing}" on the Browse board — if nobody has posted it, report it as Lost so the finder can reach you. If it's urgent or high-value, also check the Main Security Cabin on the ground floor or the main administrative office.`;
  }

  const foundThing = extractItemPhrase(clean, FOUND_VERBS);
  if (foundThing) {
    return `Thanks for picking it up! Post "${foundThing}" as a Found listing with a clear photo (blur any names or numbers), or hand it to the Main Security Cabin on the ground floor or the main administrative office and choose "Left at a desk" when posting.`;
  }

  return "That's a specific question! If it's about a lost item, try searching the keyword on the Browse board. If it's an urgent or high-value belonging (wallet, phone, hall ticket), please check with the Main Security Cabin on the ground floor or the main administrative office.";
}
