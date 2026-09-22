/* Keep the hosted checkout link usable even if the PayPal SDK is blocked. */
(function () {
  var container = document.getElementById('paypal-button-container-P-8CS01676DE0612907NHPQXBQ');
  var status = document.getElementById('paypal-subscribe-status');
  if (!container || !status) return;

  function showStatus(message) {
    status.textContent = message;
    status.hidden = false;
  }

  function checkoutError(error) {
    console.error('PayPal subscription checkout failed:', error);
    showStatus('PayPal checkout could not open or finish. If you already approved a subscription, check your PayPal account before trying again. Otherwise, use the direct link below.');
  }

  if (!window.paypal || !window.paypal.Buttons) {
    showStatus('Use the link below to subscribe securely on PayPal.');
    return;
  }

  try {
    window.paypal.Buttons({
      style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
      onClick: function () {
        status.textContent = '';
        status.hidden = true;
      },
      createSubscription: function (data, actions) {
        return actions.subscription.create({ plan_id: 'P-8CS01676DE0612907NHPQXBQ' });
      },
      onApprove: function (data) {
        showStatus('Thank you for subscribing! Subscription ID: ' + data.subscriptionID);
      },
      onCancel: function () {
        showStatus('PayPal checkout was closed. If you still want to subscribe, try again or use the direct link below.');
      },
      onError: checkoutError
    }).render(container).catch(checkoutError);
  } catch (error) {
    checkoutError(error);
  }
})();
