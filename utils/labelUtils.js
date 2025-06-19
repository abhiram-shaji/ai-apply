async function getLabelFromInput(input) {
  return await input.evaluate(el => {
    const label = el.closest('div')?.querySelector('label');
    return label ? label.innerText : 'No label';
  });
}

module.exports = { getLabelFromInput };
