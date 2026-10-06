const REPORT_CATEGORIES = new Set([
  'Suspicious or misleading listing',
  'Unsafe meetup behaviour',
  'Harassment or inappropriate contact',
  'Other safety concern',
]);

const LISTING_CONDITIONS = new Set(['Like New', 'Good', 'Acceptable', 'Worn']);
const isValidMarketplaceId = (id) => /^[1-9]\d{0,17}$/.test(String(id));

function validateReportInput(body, reporterId) {
  if (!body || typeof body !== 'object' || !REPORT_CATEGORIES.has(body.category)) {
    return { error: 'Choose a valid report category.' };
  }
  if (typeof body.description !== 'string' || body.description.trim().length < 10
      || body.description.trim().length > 2000) {
    return { error: 'Report details must be between 10 and 2000 characters.' };
  }

  const hasListing = body.listingId !== undefined && body.listingId !== null && body.listingId !== '';
  const hasUser = body.userId !== undefined && body.userId !== null && body.userId !== '';
  if (hasListing === hasUser) {
    return { error: 'Choose exactly one listing or user to report.' };
  }
  if (hasListing && !isValidMarketplaceId(body.listingId)) {
    return { error: 'Listing ID is invalid.' };
  }
  if (hasUser && !isValidMarketplaceId(body.userId)) {
    return { error: 'User ID is invalid.' };
  }
  if (hasUser && String(body.userId) === String(reporterId)) {
    return { error: 'You cannot report your own account.' };
  }

  return {
    value: {
      category: body.category,
      description: body.description.trim(),
      listingId: hasListing ? String(body.listingId) : null,
      userId: hasUser ? String(body.userId) : null,
    },
  };
}

function validateExchangeInput(body) {
  if (!body || typeof body !== 'object' || !isValidMarketplaceId(body.listingId)) {
    return { error: 'Listing ID is invalid.' };
  }
  const offeredBookTitle = typeof body.offeredBookTitle === 'string' ? body.offeredBookTitle.trim() : '';
  const offeredBookCourse = typeof body.offeredBookCourse === 'string' ? body.offeredBookCourse.trim().toUpperCase() : '';
  const conditionPreference = body.conditionPreference || null;
  const notes = body.notes === undefined || body.notes === null ? null : body.notes;
  if (offeredBookTitle.length < 2 || offeredBookTitle.length > 200) {
    return { error: 'Offered book title must be between 2 and 200 characters.' };
  }
  if (offeredBookCourse.length < 2 || offeredBookCourse.length > 30) {
    return { error: 'Offered book course must be between 2 and 30 characters.' };
  }
  if (conditionPreference !== null && !LISTING_CONDITIONS.has(conditionPreference)) {
    return { error: 'Choose a valid condition preference.' };
  }
  if (notes !== null && (typeof notes !== 'string' || notes.trim().length > 1000)) {
    return { error: 'Notes must be 1000 characters or fewer.' };
  }
  return {
    value: {
      listingId: String(body.listingId),
      offeredBookTitle,
      offeredBookCourse,
      conditionPreference,
      notes: notes?.trim() || null,
    },
  };
}

module.exports = {
  REPORT_CATEGORIES,
  isValidMarketplaceId,
  validateExchangeInput,
  validateReportInput,
};
