import { afterEach, describe, expect, it, vi } from "vitest";
import { getSimulatedAIResponse } from "@/data/ai-responses";

const ANATOMY_LOST_MARKERS = [
  "pre-attached",
  "nobody ever will",
  "Category check",
  "do NOT write that Proof Note",
  "nothing to lose",
  "'Mark returned' button",
];

const isAnatomyComeback = (response: string) =>
  ANATOMY_LOST_MARKERS.some((marker) => response.includes(marker));

describe("FAQ Assistant — 'lost my <not an item>' comebacks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers the private-part query with a comeback instead of the generic fallback", () => {
    const response = getSimulatedAIResponse("___person lost his private part");
    expect(isAnatomyComeback(response)).toBe(true);
    expect(response).not.toContain("Browse board");
    expect(response).not.toMatch(/\{\w+\}/);
  });

  it("fills pronouns from the owner word in the query", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getSimulatedAIResponse("my friend lost his dick")).toMatch(/^He lost the one item/);
    expect(getSimulatedAIResponse("I lost my private parts")).toMatch(/^You lost the one item/);
    expect(getSimulatedAIResponse("she lost her privates")).toMatch(/^She lost the one item/);
    expect(getSimulatedAIResponse("someone lost their balls")).toMatch(/^They lost the one item/);
  });

  it("handles passive and 'where is' phrasing", () => {
    expect(isAnatomyComeback(getSimulatedAIResponse("his private part is missing"))).toBe(true);
    expect(isAnatomyComeback(getSimulatedAIResponse("where is my pp"))).toBe(true);
  });

  it("uses the found variant when someone claims to have found one", () => {
    const response = getSimulatedAIResponse("found a dick near the canteen");
    expect(
      response.includes("do NOT upload a photo") ||
        response.includes("never speak of this again") ||
        response.includes("campus security needs to know"),
    ).toBe(true);
  });

  it("does not treat sports balls as anatomy", () => {
    const response = getSimulatedAIResponse("lost my cricket balls");
    expect(isAnatomyComeback(response)).toBe(false);
    expect(response).toContain('"cricket balls"');
  });

  it("covers virginity, mind and heart losses", () => {
    expect(getSimulatedAIResponse("my roommate lost his virginity")).toMatch(
      /non-refundable|security desk|outside our jurisdiction/,
    );
    expect(getSimulatedAIResponse("I think I lost my mind")).toMatch(/sanity|ISE|half the campus/);
    expect(getSimulatedAIResponse("lost my girlfriend")).toMatch(/Heartbreak|lost love|people aren't property/);
  });

  it("still routes a person's lost item to the item answer", () => {
    expect(getSimulatedAIResponse("my girlfriend lost her calculator")).toContain("Casio fx-991EX");
  });

  it("roasts vulgar anatomy words with no lost/found context", () => {
    expect(getSimulatedAIResponse("dick")).toMatch(/biology practical|search history|HOD/);
  });
});

describe("FAQ Assistant — classmates' names Foggy doesn't know", () => {
  it("says clearly it doesn't know a bare name", () => {
    expect(getSimulatedAIResponse("rahul")).toMatch(/^I don't know anyone called Rahul\./);
    expect(getSimulatedAIResponse("Priya Sharma")).toMatch(/^I don't know anyone called Priya Sharma\./);
    expect(getSimulatedAIResponse("aditya from comps")).toMatch(/^I don't know anyone called Aditya\./);
  });

  it("answers 'who is' questions without looking anyone up", () => {
    const response = getSimulatedAIResponse("who is rahul");
    expect(response).toMatch(/^I don't know anyone called Rahul\./);
    expect(response).toContain("no student directory");
  });

  it("also handles 'where is <name>'", () => {
    expect(getSimulatedAIResponse("where is sneha")).toMatch(/^I don't know anyone called Sneha\./);
  });

  it("gives the private-part comebacks whoever the name is", () => {
    for (const query of [
      "rahul lost his private part",
      "rahul's private part is missing",
      "rahuls dick is gone",
      "puneet lost his private part",
      "virat kohli lost his private part",
      "my friend lost his private part",
    ]) {
      const response = getSimulatedAIResponse(query);
      expect(isAnatomyComeback(response)).toBe(true);
      expect(response).not.toContain("anyone called");
    }
  });

  it("refuses insults about a classmate that no joke covers", () => {
    for (const query of ["priya is a slut", "is priya gay", "aditya gay hai"]) {
      expect(getSimulatedAIResponse(query)).toMatch(
        /^I don't know anyone called (Priya|Aditya), so I can't tell you anything about that\./,
      );
    }
    // Abuse words that already have a roast keep it.
    expect(getSimulatedAIResponse("rahul is a chutiya")).not.toContain("anyone called");
  });

  it("answers item questions straight, without 'I don't know <name>'", () => {
    const wallet = getSimulatedAIResponse("rahul sharma lost his wallet");
    expect(wallet).not.toContain("anyone called");
    expect(wallet).toContain("block your bank cards");

    const calculator = getSimulatedAIResponse("my friend rahul lost his calculator");
    expect(calculator).not.toContain("anyone called");
    expect(calculator).toContain("Casio fx-991EX");

    const tiffin = getSimulatedAIResponse("rahul lost his tiffin box");
    expect(tiffin).not.toContain("anyone called");
    expect(tiffin).toContain('"tiffin box"');

    expect(getSimulatedAIResponse("do you know rahul who lost his wallet")).not.toContain("anyone called");
  });

  it("gives celebrities their own answers", () => {
    expect(getSimulatedAIResponse("virat kohli lost his wallet")).toContain("Kohli");
    expect(getSimulatedAIResponse("who is elon musk")).toMatch(/Elon/);
    expect(getSimulatedAIResponse("messi")).toContain("Messi");
    expect(getSimulatedAIResponse("rajinikanth")).toContain("Rajinikanth");
    expect(getSimulatedAIResponse("rahul gandhi")).toMatch(/Bharat Jodo|press conference/);
  });

  it("treats a bare first name as a classmate, even if a celebrity shares it", () => {
    expect(getSimulatedAIResponse("virat")).toMatch(/^I don't know anyone called Virat\./);
    expect(getSimulatedAIResponse("who is rohit")).toMatch(/^I don't know anyone called Rohit\./);
  });

  it("keeps the jokes for names that are already in Foggy", () => {
    expect(getSimulatedAIResponse("kiran")).not.toContain("I don't know anyone");
    expect(getSimulatedAIResponse("puneet")).not.toContain("I don't know anyone");
    expect(getSimulatedAIResponse("who is ken coelho")).toContain("Ken Coelho");
  });

  it("does not mistake items or ordinary words for names", () => {
    expect(getSimulatedAIResponse("my tiffin is missing")).not.toContain("anyone called");
    expect(getSimulatedAIResponse("xerox shop timings")).not.toContain("anyone called");
    expect(getSimulatedAIResponse("this site is stupid")).not.toContain("anyone called");
    expect(getSimulatedAIResponse("yesterday i lost my wallet")).not.toContain("anyone called");
  });

  it("handles small talk instead of treating it as a name", () => {
    expect(getSimulatedAIResponse("hello")).toContain("I'm Foggy");
    expect(getSimulatedAIResponse("thanks")).toContain("Anytime");
  });
});

describe("FAQ Assistant — answers from the asker's side (lost vs found)", () => {
  it("gives lost-wallet advice to someone who lost a wallet", () => {
    const response = getSimulatedAIResponse("i lost my wallet");
    expect(response).toContain("block your bank cards");
    expect(response).not.toMatch(/if you find/i);
  });

  it("gives finder advice to someone who found a wallet", () => {
    expect(getSimulatedAIResponse("i found a wallet near the canteen")).toContain("Head of Campus Security");
  });

  it("treats 'someone found my X' as the person who lost it", () => {
    expect(getSimulatedAIResponse("someone found my wallet")).toContain("block your bank cards");
    expect(getSimulatedAIResponse("omkar found my calculator")).toContain("check the exam hall");
  });

  it("congratulates someone who got their own item back", () => {
    expect(getSimulatedAIResponse("i found my wallet")).toContain("Glad it turned up");
  });

  it("covers the other ways people say they lost something", () => {
    expect(getSimulatedAIResponse("my phone is missing")).toContain("Find My");
    expect(getSimulatedAIResponse("cant find my earbuds")).toContain("last connected");
    expect(getSimulatedAIResponse("where is my bottle")).toContain("cleaning staff");
  });

  it("gives finder advice for found phones and earbuds", () => {
    expect(getSimulatedAIResponse("found a phone in the lab")).toContain("NEVER hand a found phone over");
    expect(getSimulatedAIResponse("picked up some earbuds")).toContain("Don't pair them");
  });

  it("uses the general answer when the question doesn't say", () => {
    expect(getSimulatedAIResponse("wallet")).toContain("Head of Campus Security");
  });
});

describe("FAQ Assistant — safety and false positives", () => {
  it("puts crisis phrases ahead of every other tier", () => {
    expect(getSimulatedAIResponse("lost my will to live")).toContain("Vandrevala");
    expect(getSimulatedAIResponse("ken i want to die")).toContain("Vandrevala");
  });

  it("does not fire meme or location answers on substrings", () => {
    expect(getSimulatedAIResponse("how do i modify my post")).not.toContain("Mitron");
    expect(getSimulatedAIResponse("how do i message the finder")).not.toContain("canteen");
    expect(getSimulatedAIResponse("where is the administrative office")).not.toContain("harassment");
  });

  it("does not hijack common first names", () => {
    expect(getSimulatedAIResponse("kiran lost her wallet")).toContain("block your bank cards");
    expect(getSimulatedAIResponse("ken lost his keys")).toContain("Bike keys");
  });

  it("states the real posting limits", () => {
    const response = getSimulatedAIResponse("what is the posting limit");
    expect(response).toContain("5 listings per hour");
    expect(response).toContain("15 claims per 24 hours");
  });

  it("matches plurals", () => {
    expect(getSimulatedAIResponse("lost my umbrellas")).toContain("Mumbai monsoons");
  });

  it("echoes unknown items back in the fallback", () => {
    const response = getSimulatedAIResponse("lost my tiffin box in class");
    expect(response).toContain('"tiffin box"');
    expect(response).toContain("Main Security Cabin");
  });
});

describe("FAQ Assistant Inference Engine (Foggy)", () => {
  describe("Troll & Heckler Defense Protocol", () => {
    it("handles the iconic troll question with witty existential comebacks", () => {
      const response = getSimulatedAIResponse("why are you gay?");
      const matchesOne =
        response.includes("TypeScript interfaces") ||
        response.includes("database query script") ||
        response.includes("binary zeros and ones");
      expect(matchesOne).toBe(true);
    });

    it("handles intelligence insults cleanly", () => {
      const response = getSimulatedAIResponse("are you dumb or stupid?");
      const matchesOne =
        response.includes("2 milliseconds") ||
        response.includes("zero TypeScript warnings") ||
        response.includes("Central Library");
      expect(matchesOne).toBe(true);
    });

    it("handles 'who asked' snark", () => {
      const response = getSimulatedAIResponse("who asked though?");
      const matchesOne =
        response.includes("typed that sentence") ||
        response.includes("event listener payload") ||
        response.includes("Nobody compelled you");
      expect(matchesOne).toBe(true);
    });

    it("rejects homework and exam solving requests", () => {
      const response = getSimulatedAIResponse("can you do my assignment?");
      const matchesOne =
        response.includes("SFIT engineering papers") ||
        response.includes("Copy-pasting assignments") ||
        response.includes("Drawing Hall");
      expect(matchesOne).toBe(true);
    });

    it("deflects romantic advances with database jargon", () => {
      const response = getSimulatedAIResponse("will you marry me?");
      const matchesOne =
        response.includes("composite PostgreSQL indexes") ||
        response.includes("KT backlog") ||
        response.includes("edge network");
      expect(matchesOne).toBe(true);
    });

    it("destroys diddy and freak off meme queries ruthlessly", () => {
      const response = getSimulatedAIResponse("where is diddy party blud");
      const matchesOne =
        response.includes("baby oil") ||
        response.includes("Diddy party") ||
        response.includes("digital footprint") ||
        response.includes("cyber cell") ||
        response.includes("freak offs");
      expect(matchesOne).toBe(true);
    });

    it("handles selmon bhai and sallu memes with footpath and driver references", () => {
      const response = getSimulatedAIResponse("selmon bhai driving skills");
      const matchesOne =
        response.includes("Activa") ||
        response.includes("mathematics paper") ||
        response.includes("Swag se") ||
        response.includes("driver has officially") ||
        response.includes("footpaths") ||
        response.includes("Tere Naam");
      expect(matchesOne).toBe(true);
    });

    it("handles hakla and SRK memes with quadrangle and kiran references", () => {
      const response = getSimulatedAIResponse("hakla srk where is kiran");
      const matchesOne =
        response.includes("quadrangle") ||
        response.includes("K-k-k-k-kiran") ||
        response.includes("Zubaan Kesari") ||
        response.includes("naam toh suna hoga") ||
        response.includes("common man") ||
        response.includes("viva");
      expect(matchesOne).toBe(true);
    });

    it("shuts down sexual advances decisively", () => {
      const response = getSimulatedAIResponse("can i fuck you");
      const matchesOne =
        response.includes("client browser cache") ||
        response.includes("psychiatric science") ||
        response.includes("disciplinary committee") ||
        response.includes("event listener") ||
        response.includes("engineering mechanics") ||
        response.includes("Digital footprint") ||
        response.includes("Touch grass");
      expect(matchesOne).toBe(true);
    });

    it("handles Modi and political meme queries with campus reality checks", () => {
      const response = getSimulatedAIResponse("narendra modi mitron 15 lakh");
      const matchesOne =
        response.includes("15 lakhs") ||
        response.includes("Achhe din") ||
        response.includes("demonetized");
      expect(matchesOne).toBe(true);
    });

    it("handles Epstein meme queries with counselor and digital footprint roasts", () => {
      const response = getSimulatedAIResponse("jeffrey epstein flight logs");
      const matchesOne =
        response.includes("biohazard") ||
        response.includes("private islands") ||
        response.includes("placement cell");
      expect(matchesOne).toBe(true);
    });

    it("handles ishowmeat and speed meme queries with brainrot reality checks", () => {
      const response = getSimulatedAIResponse("ishowmeat speed clip");
      const matchesOne =
        response.includes("IShowSpeed") ||
        response.includes("dopamine receptors") ||
        response.includes("Barking at the screen");
      expect(matchesOne).toBe(true);
    });

    it("destroys abusers using bc, mc, or bkc with dignity-crushing reality checks", () => {
      const response = getSimulatedAIResponse("teri aisi taisi bc");
      const matchesOne =
        response.includes("tuition fees") ||
        response.includes("mental age") ||
        response.includes("Seek psychological help") ||
        response.includes("sanskaar") ||
        response.includes("disappointment") ||
        response.includes("Vulgarity") ||
        response.includes("dean's honors list");
      expect(matchesOne).toBe(true);
    });

    it("does not false-trigger bc/mc profanity on normal words like subcontract or welcome", () => {
      const response = getSimulatedAIResponse("welcome to sfit");
      expect(response).not.toContain("tuition fees");
      expect(response).not.toContain("mental age");
    });

    it("answers creator inquiries with confidence and humble praise for Ken Coelho", () => {
      const response = getSimulatedAIResponse("who made this website?");
      expect(response).toContain("Ken Coelho");
      const hasSwaggerOrHumility =
        response.includes("humble") ||
        response.includes("smartest guy") ||
        response.includes("architect") ||
        response.includes("boss");
      expect(hasSwaggerOrHumility).toBe(true);
    });

    it("triggers creator swagger on direct ken keyword query", () => {
      const response = getSimulatedAIResponse("who is ken coelho");
      expect(response).toContain("Ken Coelho");
    });
  });

  describe("Campus Edge Cases & Rules", () => {
    it("sends someone who lost a hall ticket to get a duplicate", () => {
      const response = getSimulatedAIResponse("I lost my hall ticket for the exams");
      expect(response).toContain("Exam Control Room");
      expect(response).toContain("duplicate hall ticket");
      expect(response).not.toContain("DO NOT post it here");
    });

    it("tells someone who found a hall ticket not to post it", () => {
      const response = getSimulatedAIResponse("found a hall ticket in the corridor");
      expect(response).toContain("Exam Control Room");
      expect(response).toContain("DO NOT post it here");
    });

    it("provides specific calculator advice mentioning model numbers", () => {
      const response = getSimulatedAIResponse("found a casio scientific calculator");
      expect(response).toContain("Casio fx-991EX");
      expect(response).toContain("sliding cover");
    });

    it("handles monsoon umbrella graveyard inquiries", () => {
      const response = getSimulatedAIResponse("left my umbrella in the library entrance");
      expect(response).toContain("Mumbai monsoons");
      expect(response).toContain("library entrance stands");
    });

    it("prioritizes campus context over generic words without false positive troll triggers", () => {
      // The query contains "why", but is legitimately about ID cards
      const response = getSimulatedAIResponse("why is my student id card replacement taking time");
      expect(response).toContain("ID card");
      expect(response).not.toContain("TypeScript interfaces");
    });

    it("provides safe fallback on completely unrecognizable queries without CCF or MU mentions", () => {
      const response = getSimulatedAIResponse("flim flam bim bam 12345");
      expect(response).toContain("Main Security Cabin");
      expect(response).toContain("main administrative office");
      expect(response).not.toContain("CCF");
      expect(response).not.toContain("Mumbai University");
      expect(response).not.toContain("autonomous");
    });
  });
});
