const { getAIExtractedLabel } = require('./aiLabelService');

async function getLabelFromInput(input) {
  const label = await input.evaluate(el => {
    // For radio buttons, prefer the fieldset legend text which usually
    // represents the actual question for the group
    if (el.getAttribute('type') === 'radio') {
      const legend = el.closest('fieldset')?.querySelector('legend');
      if (legend) return legend.innerText.trim();
    }

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
    if (placeholder && placeholder.length > 5) return placeholder.trim();

    const fieldsetLegend = el.closest('fieldset')?.querySelector('legend');
    if (fieldsetLegend) return fieldsetLegend.innerText.trim();

    return null;
  });

  if (label) return label;

  const outerHTML = await input.evaluate(el => el.closest('form')?.outerHTML || el.outerHTML);
  const aiLabel = await getAIExtractedLabel(outerHTML.slice(0, 2000));
  console.log(`🤖 AI-extracted label: "${aiLabel}"`);
  return aiLabel;
}

async function getRadioOptionLabel(input) {
  return input.evaluate(el => {
    if (el.id) {
      const byFor = document.querySelector(`label[for="${el.id}"]`);
      if (byFor) return byFor.innerText.trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.innerText.trim();

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    return el.getAttribute('value') || '';
  });
}

module.exports = { getLabelFromInput, getRadioOptionLabel };
