import { AnswerStatus } from "../types";

export interface ValidationResult {
    text: string;
    status: AnswerStatus;
}

export class ValidationManager {
    /**
     * Processing pipeline:
     * 1. Normalize (NFKD)
     * 2. Remove Diacritics
     * 3. Trim & Uppercase
     * 4. Check Constraints (Empty, Starting Letter)
     */
    public processAnswer(input: string, currentLetter: string): ValidationResult {
        if (!input) {
            return { text: "", status: "EMPTY" };
        }

        // 1. Normalization Pipeline
        const normalized = input
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""); // Remove accents

        // 2. Empty Check
        if (normalized.length === 0) {
            return { text: "", status: "EMPTY" };
        }

        // 3. Rule Check: Starts with correct letter
        const targetLetter = currentLetter
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (!normalized.startsWith(targetLetter)) {
            return { text: normalized, status: "INVALID" };
        }

        // 4. Dictionary Check (Future Phase 4 placeholder)
        // if (!this.checkDictionary(normalized)) return { ... "INVALID" }

        // Default: Pending Review
        return { text: normalized, status: "PENDING" };
    }
}
