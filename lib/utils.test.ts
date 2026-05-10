/// <reference types="vitest/globals" />
import { cn } from './utils';

test('cn merges class names', () => {
  expect(cn('a', 'b')).toBe('a b');
});
