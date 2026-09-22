import { describe, expect, it } from "vitest";
import { getSimulatedAIResponse } from "@/data/ai-responses";

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
    it("returns critical security advice for lost SFIT hall tickets", () => {
      const response = getSimulatedAIResponse("I lost my hall ticket for the exams");
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
