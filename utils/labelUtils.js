async function getLabelFromInput(input) {
  return await input.evaluate(el => {
    // 1. Directly associated label via id/for
    if (el.id) {
      const byFor = document.querySelector(`label[for="${el.id}"]`);
      if (byFor) return byFor.innerText.trim();
    }

    const labelEl = el.closest('div')?.querySelector('label');
    if (labelEl) return labelEl.innerText.trim();

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const ref = document.getElementById(ariaLabelledBy);
      if (ref) return ref.innerText.trim();
    }
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder.trim();
    return 'No label';
  });
}

module.exports = { getLabelFromInput };
