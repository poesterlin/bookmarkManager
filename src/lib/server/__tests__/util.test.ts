import { describe, it, expect } from 'bun:test';
import { generateId, validateUsername, validatePassword } from '../util';

describe('Utility Functions', () => {
	describe('generateId()', () => {
		it('should generate a unique ID', () => {
			const id1 = generateId();
			const id2 = generateId();

			expect(id1).toBeTruthy();
			expect(id2).toBeTruthy();
			expect(id1).not.toBe(id2);
		});

		it('should generate IDs with sufficient entropy', () => {
			const ids = new Set();
			for (let i = 0; i < 1000; i++) {
				ids.add(generateId());
			}

			expect(ids.size).toBe(1000);
		});

		it('should generate IDs of consistent length', () => {
			const id1 = generateId();
			const id2 = generateId();
			const id3 = generateId();

			expect(id1.length).toBe(id2.length);
			expect(id2.length).toBe(id3.length);
		});
	});

	describe('validateUsername()', () => {
		it('should accept valid usernames', () => {
			expect(validateUsername('john')).toBe(true);
			expect(validateUsername('alice123')).toBe(true);
			expect(validateUsername('user_name')).toBe(true);
		});

		it('should reject usernames that are too short', () => {
			expect(validateUsername('ab')).toBe(false);
		});

		it('should reject usernames that are too long', () => {
			expect(validateUsername('a'.repeat(32))).toBe(false);
		});

		it('should reject empty usernames', () => {
			expect(validateUsername('')).toBe(false);
		});

		it('should accept usernames with hyphens and underscores', () => {
			expect(validateUsername('john-doe')).toBe(true);
			expect(validateUsername('user_name')).toBe(true);
		});
	});

	describe('validatePassword()', () => {
		it('should accept valid passwords', () => {
			expect(validatePassword('password123')).toBe(true);
			expect(validatePassword('secureP@ss')).toBe(true);
		});

		it('should reject passwords that are too short', () => {
			expect(validatePassword('short')).toBe(false);
		});

		it('should reject passwords that are too long', () => {
			expect(validatePassword('a'.repeat(256))).toBe(false);
		});

		it('should reject empty passwords', () => {
			expect(validatePassword('')).toBe(false);
		});

		it('should accept passwords with special characters', () => {
			expect(validatePassword('P@ssw0rd!#$%')).toBe(true);
		});
	});
});
