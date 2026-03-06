/**
 * Normalize phone — always returns 91XXXXXXXXXX (digits only)
 */
const normalizePhone = (phone) => {
    if (!phone) return '';
    let num = String(phone).replace(/[^0-9]/g, '');
    if (num.length === 10) num = '91' + num;
    return num;
};

/**
 * Get variations for searching (91..., +91..., 10-digit)
 */
const getSearchVariations = (phone) => {
    const normalized = normalizePhone(phone);
    if (!normalized) return [];

    const variations = [normalized, `+${normalized}`];
    if (normalized.startsWith('91') && normalized.length === 12) {
        variations.push(normalized.substring(2)); // 10 digit version
    }
    return [...new Set(variations)];
};

module.exports = { normalizePhone, getSearchVariations };
