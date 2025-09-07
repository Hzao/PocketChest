import { describe, it, expect } from 'vitest';
import { generateRetrievalCode, isValidRetrievalCode } from '../src/utils';

describe('Code Generation', () => {
	it('should not generate codes containing letter "O"', () => {
		// Generate many codes to ensure "O" is never used
		const codes: string[] = [];
		for (let i = 0; i < 1000; i++) {
			codes.push(generateRetrievalCode());
		}

		// Check that no code contains the letter "O"
		const codesWithO = codes.filter(code => code.includes('O'));
		expect(codesWithO).toHaveLength(0);
	});

	it('should still generate codes containing number "0"', () => {
		// Generate many codes to increase probability of getting "0"
		const codes: string[] = [];
		for (let i = 0; i < 1000; i++) {
			codes.push(generateRetrievalCode());
		}

		// Check that at least some codes contain the number "0"
		// With 1000 attempts and 6 characters each, we should get some "0"s
		const codesWith0 = codes.filter(code => code.includes('0'));
		expect(codesWith0.length).toBeGreaterThan(0);
	});

	it('should generate codes with exactly 6 characters', () => {
		for (let i = 0; i < 100; i++) {
			const code = generateRetrievalCode();
			expect(code).toHaveLength(6);
		}
	});

	it('should generate codes using only allowed characters', () => {
		const allowedChars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789'; // Note: no "O"
		
		for (let i = 0; i < 100; i++) {
			const code = generateRetrievalCode();
			for (const char of code) {
				expect(allowedChars).toContain(char);
			}
		}
	});
});

describe('Code Validation', () => {
	it('should validate codes without letter "O" as valid', () => {
		expect(isValidRetrievalCode('ABC123')).toBe(true);
		expect(isValidRetrievalCode('XYZ456')).toBe(true);
		expect(isValidRetrievalCode('DEF0GH')).toBe(true);
	});

	it('should accept codes containing letter "O" for backward compatibility', () => {
		expect(isValidRetrievalCode('ABCODE')).toBe(true);
		expect(isValidRetrievalCode('ABC12O')).toBe(true);
		expect(isValidRetrievalCode('OOOABC')).toBe(true);
	});

	it('should accept codes containing number "0"', () => {
		expect(isValidRetrievalCode('ABC0DE')).toBe(true);
		expect(isValidRetrievalCode('000000')).toBe(true);
		expect(isValidRetrievalCode('A0B0C0')).toBe(true);
	});

	it('should reject codes with wrong length', () => {
		expect(isValidRetrievalCode('ABC12')).toBe(false); // too short
		expect(isValidRetrievalCode('ABC1234')).toBe(false); // too long
		expect(isValidRetrievalCode('')).toBe(false); // empty
	});

	it('should reject codes with lowercase letters', () => {
		expect(isValidRetrievalCode('abc123')).toBe(false);
		expect(isValidRetrievalCode('ABc123')).toBe(false);
	});
});