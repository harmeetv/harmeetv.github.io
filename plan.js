
  const baseUrl = "https://apiv2.channelforcestage.com"
  
  $(document).ready(function() {
  
  // unbind any form submitting action from webflow
  $(document).off('submit');
  
  // Start hotfix for Safari
  $('.slide').hide();
  setTimeout(function(){$('.slide').show();}, 50);
  // End hotfix for Safari
  
  function showLoader() {
    $('#loading').css('z-index', '1000');
  }
  
  function hideLoader() {
    $('#loading').css('z-index', '0');
  }

  var resp = {};
  $('#expand-radio').prop('checked',true);
  $('#launch-additional-users').val(0);
  $('#expand-additional-users').val(0);
  $('#growth-additional-users').val(0);

  function currencyFormatter(price) {
    const currency = $('#currency-select').val();
    const locale = window.navigator.language;
    if (isNaN(Number(price))) {
      return fallbackValue || '--';
    }
    try {
      return Number(price).toLocaleString(locale, {
        style: 'currency',
        currencyDisplay: 'narrowSymbol',
        currency
      });
    } catch (error) {
      console.error(error);
      return currency;
    }
  }

  function getBasePrice(plan) {
    const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
    const targetPlan = resp.data.find(a => a.name === plan);
    const targetTier = targetPlan.plan_tiers.find(a => a.period === period);
    const basePlanPrice =  targetTier.tier.find(a => a.starting_unit === 1).price + targetTier.tier.find(a => a.starting_unit === 2).price;
    return basePlanPrice;
  }

  function getAdditionalUserPrice(plan) {
    const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
    const targetPlan = resp.data.find(a => a.name === plan);
    const targetTier = targetPlan.plan_tiers.find(a => a.period === period);
    const additionalPrice = targetTier.tier.find(a => a.starting_unit === 3).price;
    return additionalPrice;
  }

  function getSavingText() {
    const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
    const selectedPlan = $('#launch-radio').is(':checked') ? 'launch' : $('#growth-radio').is(':checked') ? 'growth' : 'expand';
    const targetPlan = resp.data.find(a => a.name === selectedPlan);
    const monthlyTier = targetPlan.plan_tiers.find(a => a.period === 'monthly');
    const annualTier = targetPlan.plan_tiers.find(a => a.period === 'annual');
    const launchAdditionalUsers = $('#launch-additional-users').val() || 0 ;
    const expandAdditionalUsers = $('#expand-additional-users').val() || 0 ;
    const growthAdditionalUsers = $('#growth-additional-users').val() || 0 ;
    const selectedUsers = selectedPlan === 'launch' ? launchAdditionalUsers : selectedPlan === 'growth' ? growthAdditionalUsers : expandAdditionalUsers;
    const totalPriceMonthly = (monthlyTier.tier.find(a => a.starting_unit === 1).price + monthlyTier.tier.find(a => a.starting_unit === 2).price) + (selectedUsers * monthlyTier.tier.find(a => a.starting_unit === 3).price);
    const totalPriceAnnual = (annualTier.tier.find(a => a.starting_unit === 1).price + annualTier.tier.find(a => a.starting_unit === 2).price) + (selectedUsers * annualTier.tier.find(a => a.starting_unit === 3).price);
    const savings = totalPriceMonthly - (totalPriceAnnual/12);
    return period === 'annual' ? 'Saving additonal ' + currencyFormatter(savings) : 'Switch to yearly and save additional ' + currencyFormatter(savings);
  }

  function sanitizeUserInput() {
    if ($('#launch-additional-users').val() < 0 ) {
      $('#launch-additional-users').val(0);
    }
    if ($('#expand-additional-users').val() < 0 ) {
      $('#expand-additional-users').val(0);
    }
    if ($('#growth-additional-users').val() < 0 ) {
      $('#growth-additional-users').val(0);
    }
    $('#launch-additional-users').val(Math.floor($('#launch-additional-users').val()));
    $('#expand-additional-users').val(Math.floor($('#expand-additional-users').val()));
    $('#growth-additional-users').val(Math.floor($('#growth-additional-users').val()));
  }

  function getInputData() {
    const selectedPlan = $('#launch-radio').is(':checked') ? 'launch' : $('#growth-radio').is(':checked') ? 'growth' : 'expand';
    const currency = $('#currency-select').val();
    const couponCode = $('#coupon-code-2').val();
    const launchAdditionalUsers = $('#launch-additional-users').val() || 0 ;
    const expandAdditionalUsers = $('#expand-additional-users').val() || 0 ;
    const growthAdditionalUsers = $('#growth-additional-users').val() || 0 ;
    const selectedUsers = selectedPlan === 'launch' ? launchAdditionalUsers : selectedPlan === 'growth' ? growthAdditionalUsers : expandAdditionalUsers;
    const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
    const planId = selectedPlan + "-" + period + "-" + currency.toLowerCase();
    return {
      couponCode,
      selectedPlan,
      currency,
      selectedUsers,
      period,
      planId
    }
  }
  
  function updateDescriptions() {
    const planFeatureBlockTemplate = `<div class="plan-feature-block">
      <div class="plan-bullet-image-wrapper">
        <img src="https://assets.website-files.com/5d9c347f1416aefa5128c8c3/6062f350c076ba4bdf9424cb_tick-plan.svg" loading="lazy" width="16" alt="">
      </div>
      <div class="plan-feature-text-wrapper">
        <div>{{featureName}}</div>
      </div>
    </div>`;
    for (let plan of resp.data) {
      let planFeatures = $($(`#${plan.name}-plan-column>div:first-of-type>.plan-features`)[0]);
      planFeatures.html("");
      for (let featureName of plan.description) {
        planFeatures.html(`${planFeatures.html()}${planFeatureBlockTemplate.replace("{{featureName}}", featureName)}`);
      }
    }
  }

  async function getInvoiceEstimate() {
    const { planId, selectedUsers, couponCode } = getInputData();
    console.log(planId, selectedUsers, couponCode);
    showLoader();
    try {
      const { invoiceEstimate } = await $.ajax({
        type: 'GET',
        url: `${baseUrl}/v2/companies/invoice/estimate?plan_id=${planId}&quantity=${+selectedUsers + 2}`,
        data: JSON.stringify({}),
        contentType: "application/json",
        dataType: "json"
      });
      console.log("invoiceEstimate", invoiceEstimate);
      return invoiceEstimate
    } catch (error) {
      console.error(error);
    } finally {
      hideLoader();
    }
  }

  async function refreshCalculations() {
    try {
    sanitizeUserInput();
    await getInvoiceEstimate()
    const isYearly = $('#period-checkbox').is(":checked");
    const selectedPlan = $('#launch-radio').is(':checked') ? 'launch' : $('#growth-radio').is(':checked') ? 'growth' : 'expand';

    const launchBasePrice = getBasePrice('launch');
    const expandBasePrice = getBasePrice('expand');
    const growthBasePrice = getBasePrice('growth');

    const launchAdditionalPrice = getAdditionalUserPrice('launch');
    const expandAdditionalPrice = getAdditionalUserPrice('expand');
    const growthAdditionalPrice = getAdditionalUserPrice('growth');

    const launchAdditionalUsers = $('#launch-additional-users').val() || 0 ;
    const expandAdditionalUsers = $('#expand-additional-users').val() || 0 ;
    const growthAdditionalUsers = $('#growth-additional-users').val() || 0 ;

    const totalPrice = selectedPlan === 'launch' ? launchBasePrice + (launchAdditionalUsers * launchAdditionalPrice) : selectedPlan === 'growth' ? growthBasePrice + (growthAdditionalUsers * growthAdditionalPrice) : expandBasePrice + (expandAdditionalUsers * expandAdditionalPrice);

    const additionalUsers = selectedPlan === 'launch' ? launchAdditionalUsers : selectedPlan === 'growth' ? growthAdditionalUsers : expandAdditionalUsers;
    const summaryText = (selectedPlan === 'launch' ? 'Launch' : selectedPlan === 'growth' ? 'Growth' : 'Expand') + (additionalUsers && additionalUsers > 0 ? ' | ' + additionalUsers + ' additional users' : '');

    $('#launch-base-price').text(currencyFormatter(isYearly ? launchBasePrice/12 : launchBasePrice) + "/month" );
    $('#expand-base-price').text(currencyFormatter(isYearly ? expandBasePrice/12 : expandBasePrice) + "/month" );
    $('#growth-base-price').text(currencyFormatter(isYearly ? growthBasePrice/12 : growthBasePrice) + "/month" );
    $('#launch-additional-user-price').text(currencyFormatter(isYearly ? launchAdditionalPrice/12 : launchAdditionalPrice) + " / user");
    $('#expand-additional-user-price').text(currencyFormatter(isYearly ? expandAdditionalPrice/12 : expandAdditionalPrice) + " / user");
    $('#growth-additional-user-price').text(currencyFormatter(isYearly ? growthAdditionalPrice/12 : growthAdditionalPrice) + " / user");
    $('#total-price').text(currencyFormatter(isYearly ? totalPrice/12 : totalPrice) + "/month");
    $('#plan-summary-text').text(summaryText);
    $('#recommend-yearly').text(getSavingText());
    } catch(err) {
      console.log("err", err);
    }
  }

  async function refreshPlanDetailsData() {
    const currency = $('#currency-select').val();
    showLoader();
    try {
      resp = await $.ajax({
        type: 'GET',
        url: baseUrl + '/v2/plan/details?currency=' + currency,
        data: JSON.stringify({}),
        contentType: "application/json",
        dataType: "json"
      });
      refreshCalculations();
      updateDescriptions();
    } catch (error) {
      console.error(error);
      window.location.href = "/failure";
    } finally {
      hideLoader();
    }
  }

  refreshPlanDetailsData();

  $('#period-checkbox').change(refreshCalculations);
  $('#launch-radio').change(refreshCalculations);
  $('#expand-radio').change(refreshCalculations);
  $('#growth-radio').change(refreshCalculations);
  $('#launch-additional-users').change(refreshCalculations);
  $('#expand-additional-users').change(refreshCalculations);
  $('#growth-additional-users').change(refreshCalculations);

  $('#currency-select').change(refreshPlanDetailsData);

  $('#lets-begin').click(function() {
    window.location.href = "/register?plan_id=" + selectedPlan + '&no_of_additional_users=' + selectedUsers;
  });
    
    
  });

