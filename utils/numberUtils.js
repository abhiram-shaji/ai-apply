function extractNumericValue(str) {
  if (!str) return NaN;
  const num = str.match(/\d+(?:\.\d+)?/);
  if (num) return parseFloat(num[0]);

  const words = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
  };

  for (const token of str.toLowerCase().split(/\s|-/)) {
    if (words[token] !== undefined) {
      return words[token];
    }
  }

  return NaN;
}

module.exports = { extractNumericValue };
