/* One renderer for Pages publishing and VS Code source previews. */
(function (root) {
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function checkoutURL(plan) {
    if (!plan) return '';
    if (!/^P-[A-Z0-9]+$/.test(plan)) throw new Error('Invalid PayPal subscription plan ID');
    return 'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=' + plan;
  }

  const leaf = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false"><path d="M32 54V30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M31 38C15 38 12 23 13 13c14 1 23 10 18 25Z" fill="currentColor" opacity=".6"/><path d="M33 31C32 16 44 10 54 10c0 14-7 23-21 21Z" fill="currentColor"/><path d="m22 25 10 17m11-22L32 33" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function renderContributions(data) {
    if (!Array.isArray(data.tiers) || !data.tiers.length) throw new Error('Add at least one contribution tier');
    if (!/^[A-Z]{3}$/.test(data.currency)) throw new Error('Use a three-letter currency code');
    const help = data.help || {};
    const plans = new Set();
    const cards = data.tiers.map((tier, index) => {
      const amount = Number(tier.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Contribution amounts must be positive');
      const amountText = amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
      const color = ['green', 'gold', 'blue'].includes(tier.color) ? tier.color : 'green';
      const url = checkoutURL(tier.paypal_plan_id);
      if (url && plans.has(url)) throw new Error('Each contribution tier needs its own PayPal plan');
      if (url) plans.add(url);
      const label = url ? data.checkout_label : data.unavailable_label;
      const accessibleLabel = url
        ? `${label}: ${tier.name}, ${amountText} ${data.currency} per month`
        : `${label}: ${tier.name}`;
      return `<article class="contribution-card contribution-card--${color}" aria-labelledby="tier-${index}">
        <span class="contribution-leaf">${leaf}</span>
        <h3 id="tier-${index}">${esc(tier.name)}</h3>
        <p class="contribution-price"><strong>${esc(amountText)}</strong><span>${esc(data.currency)}<br>per month</span></p>
        <p class="contribution-description">${esc(tier.description)}</p>
        <a class="btn contribution-checkout" href="${esc(url || 'contact.html')}" aria-label="${esc(accessibleLabel)}">${esc(label)}<span aria-hidden="true">&rarr;</span></a>
      </article>`;
    }).join('\n');

    return `<section class="contribution-hero" aria-labelledby="contributions-title">
      <div class="container">
        <p class="contribution-eyebrow">${esc(data.eyebrow)}</p>
        <h1 id="contributions-title">${esc(data.title)}</h1>
        <p class="contribution-intro">${esc(data.intro)}</p>
      </div>
      <div class="contribution-hero-leaf" aria-hidden="true">${leaf}</div>
    </section>
    <div class="who-title-slice">
      <img class="who-bg-image" src="images/communicacionplena.avif" alt="" width="1275" height="663" decoding="async">
      <div class="who-bg-overlay" aria-hidden="true"></div>
    </div>
    <section class="contribution-options" aria-labelledby="contributions-options-title">
      <div class="container">
        <div class="contribution-section-intro">
          <h2 id="contributions-options-title">${esc(data.tiers_heading)}</h2>
          <p>${esc(data.tiers_intro)}</p>
        </div>
        <div class="contribution-grid">${cards}</div>
        <p class="contribution-billing-note">${esc(data.billing_note)}</p>
        <aside class="contribution-help" aria-labelledby="contributions-help-title">
          <div>
            <p class="contribution-eyebrow">${esc(help.eyebrow)}</p>
            <h2 id="contributions-help-title">${esc(help.title)}</h2>
            <p>${esc(help.text)}</p>
          </div>
          <a class="btn" href="contact.html">${esc(help.link_label)}<span aria-hidden="true">&rarr;</span></a>
        </aside>
        <p class="contribution-enrollment">${esc(data.enrollment_note)} <a href="programs.html">${esc(data.enrollment_link_label)} &rarr;</a></p>
      </div>
    </section>`;
  }

  if (typeof module === 'object' && module.exports) module.exports = { renderContributions, checkoutURL };
  else root.etRenderContributions = renderContributions;
})(typeof window !== 'undefined' ? window : globalThis);
