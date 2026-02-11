import { AnswerStatus } from "../types";
import { DictionaryManager } from "../dictionaries/manager";

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
     * 5. Dictionary Auto-Validation (Escudo Dorado)
     */
    public processAnswer(input: string, currentLetter: string, categoryId: string = ''): ValidationResult {
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

        // 4. Dictionary Auto-Validation (Escudo Dorado 🛡️)
        if (categoryId && DictionaryManager.hasExact(categoryId, normalized)) {
            return { text: normalized, status: "VALID_AUTO" };
        }

        // Default: Pending Review (votación manual)
        return { text: normalized, status: "PENDING" };
    }
}
