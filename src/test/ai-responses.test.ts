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

    it("provides safe fallback on completely unrecognizable queries", () => {
      const response = getSimulatedAIResponse("flim flam bim bam 12345");
      expect(response).toContain("Main Security Cabin");
    });
  });
});
