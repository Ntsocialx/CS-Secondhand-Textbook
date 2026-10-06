const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateExchangeInput,
  validateReportInput,
} = require('../lib/marketplace-validation');

test('valid reports are normalized and do not accept client reporter identity', () => {
  const result = validateReportInput({
    category: 'Suspicious or misleading listing',
    description: '   This listing appears to be counterfeit.   ',
    listingId: 17,
    reporterId: 999,
    reporterEmail: 'forged@example.com',
  }, 42);

  assert.deepEqual(result, {
    value: {
      category: 'Suspicious or misleading listing',
      description: 'This listing appears to be counterfeit.',
      listingId: '17',
      userId: null,
    },
  });
});

test('reports require one valid target and disallow self-reporting', () => {
  const base = {
    category: 'Other safety concern',
    description: 'A sufficiently detailed report.',
  };
  assert.equal(validateReportInput(base, 42).error, 'Choose exactly one listing or user to report.');
  assert.equal(validateReportInput({ ...base, listingId: '1', userId: '2' }, 42).error,
    'Choose exactly one listing or user to report.');
  assert.equal(validateReportInput({ ...base, userId: '42' }, 42).error,
    'You cannot report your own account.');
});

test('reports reject unapproved categories and invalid description lengths', () => {
  assert.equal(validateReportInput({
    category: 'Something else',
    description: 'A sufficiently detailed report.',
    listingId: '1',
  }, 42).error, 'Choose a valid report category.');
  assert.equal(validateReportInput({
    category: 'Other safety concern',
    description: 'short',
    listingId: '1',
  }, 42).error, 'Report details must be between 10 and 2000 characters.');
});

test('exchange input is normalized and bounded', () => {
  assert.deepEqual(validateExchangeInput({
    listingId: 7,
    offeredBookTitle: '  Intro to Programming ',
    offeredBookCourse: ' csc101 ',
    conditionPreference: 'Good',
    notes: '  Happy to meet on campus. ',
  }), {
    value: {
      listingId: '7',
      offeredBookTitle: 'Intro to Programming',
      offeredBookCourse: 'CSC101',
      conditionPreference: 'Good',
      notes: 'Happy to meet on campus.',
    },
  });
});

test('exchange input rejects invalid IDs, conditions, and oversized notes', () => {
  assert.equal(validateExchangeInput({ listingId: '0' }).error, 'Listing ID is invalid.');
  const valid = { listingId: '1', offeredBookTitle: 'Textbook', offeredBookCourse: 'CSC1' };
  assert.equal(validateExchangeInput({ ...valid, conditionPreference: 'Unknown' }).error,
    'Choose a valid condition preference.');
  assert.equal(validateExchangeInput({ ...valid, notes: 'x'.repeat(1001) }).error,
    'Notes must be 1000 characters or fewer.');
});
