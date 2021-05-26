  const baseUrl = window.location.host==="www.zomentum.com" ? "https://api.zomentum.com" : "https://apiv2.channelforcestage.com"
  
  $(document).ready(function() {
  
  $(".plan-button.monthly").addClass('active-period')
    
  // unbind any form submitting action from webflow
  $(document).off('submit');
  
  // Start hotfix for Safari
  $('.slide').hide();
  setTimeout(function(){$('.slide').show();}, 50);
  // End hotfix for Safari

  function showLoader() {
    $('#loading').css('display', 'flex');
  }
  
  function hideLoader() {
    $('#loading').css('display', 'none');
  }

  let resp = {};
  let isCouponApplied = false;
  let monthlyInvoiceEstimate = 0;
  let annualInvoiceEstimate = 0;
  let activePeriod = 'monthly';

  const onChangePlan = () => {
      let selectedPlan = $('input[type=radio][name="radio"]:checked').val();
      $("#launch-additional-users").attr('disabled', true);
      $("#expand-additional-users").attr('disabled', true);
      $("#growth-additional-users").attr('disabled', true);
      $(`#${selectedPlan}-additional-users`).attr('disabled', false);
  }

  $('input[type=radio][name=radio]').change(onChangePlan);

  $('#expand-radio').prop('checked',true);
  setTimeout(() => {
    onChangePlan();
  }, 0);

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
    // const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
    const targetPlan = resp.data.find(a => a.name === plan);
    const targetTier = targetPlan.plan_tiers.find(a => a.period === activePeriod);
    const basePlanPrice =  targetTier.tier.find(a => a.starting_unit === 1).price + targetTier.tier.find(a => a.starting_unit === 2).price;
    return basePlanPrice;
  }

  function getAdditionalUserPrice(plan) {
    // const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
    const targetPlan = resp.data.find(a => a.name === plan);
    const targetTier = targetPlan.plan_tiers.find(a => a.period === activePeriod);
    const additionalPrice = targetTier.tier.find(a => a.starting_unit === 3).price;
    return additionalPrice;
  }

  function getSavingText() {
    // const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
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
    let savings;
    if (isCouponApplied) {
      savings = monthlyInvoiceEstimate - (annualInvoiceEstimate/12);
    } else {
      savings = totalPriceMonthly - (totalPriceAnnual/12);
    }
    return activePeriod === 'annual' ? 'Saving additonal ' + currencyFormatter(savings) + '/month' : 'Switch to yearly and save additional ' + currencyFormatter(savings) +  '/month';
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
    // const period = $('#period-checkbox').is(":checked") ? "annual" : "monthly";
    const planId = selectedPlan + "-" + activePeriod + "-" + currency.toLowerCase();
    return {
      couponCode,
      selectedPlan,
      currency,
      selectedUsers,
      period: activePeriod,
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

  async function getInvoiceEstimates() {
    const { selectedUsers, couponCode, selectedPlan, currency } = getInputData();
    showLoader();
    try {
      const monthlyPlanId = `${selectedPlan}-monthly-${currency.toLowerCase()}`;
      const annualPlanId = `${selectedPlan}-annual-${currency.toLowerCase()}`;
      const { invoice_estimate: monthly_invoice_estimate } = await $.ajax({
        type: 'GET',
        url: `${baseUrl}/v2/companies/invoice/estimate?plan_id=${monthlyPlanId}&quantity=${+selectedUsers + 2}&coupon=${couponCode}`,
        contentType: "application/json",
        dataType: "json"
      });
      const { invoice_estimate: annual_invoice_estimate } = await $.ajax({
        type: 'GET',
        url: `${baseUrl}/v2/companies/invoice/estimate?plan_id=${annualPlanId}&quantity=${+selectedUsers + 2}&coupon=${couponCode}`,
        contentType: "application/json",
        dataType: "json"
      });
      monthlyInvoiceEstimate = monthly_invoice_estimate;
      annualInvoiceEstimate = annual_invoice_estimate;
      isCouponApplied = true;
    } catch (error) {
      isCouponApplied = false;
    } finally {
      hideLoader();
    }
  }

  async function refreshCalculations() {
    try {
      sanitizeUserInput();
      if (isCouponApplied) {
        await getInvoiceEstimates();
      }
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
      // const summaryText = (selectedPlan === 'launch' ? 'Launch' : selectedPlan === 'growth' ? 'Growth' : 'Expand') + (additionalUsers && additionalUsers > 0 ? ' | ' + additionalUsers + ' additional users' : '');
      const summaryText = (selectedPlan === 'launch' ? 'Plan: Launch' : selectedPlan === 'growth' ? 'Plan: Growth' : 'Plan: Expand');

      $('#launch-base-price').text(currencyFormatter(isYearly ? launchBasePrice/12 : launchBasePrice) + "/month" );
      $('#expand-base-price').text(currencyFormatter(isYearly ? expandBasePrice/12 : expandBasePrice) + "/month" );
      $('#growth-base-price').text(currencyFormatter(isYearly ? growthBasePrice/12 : growthBasePrice) + "/month" );
      $('#launch-additional-user-price').text(currencyFormatter(isYearly ? launchAdditionalPrice/12 : launchAdditionalPrice) + " / user");
      $('#expand-additional-user-price').text(currencyFormatter(isYearly ? expandAdditionalPrice/12 : expandAdditionalPrice) + " / user");
      $('#growth-additional-user-price').text(currencyFormatter(isYearly ? growthAdditionalPrice/12 : growthAdditionalPrice) + " / user");
      if (isCouponApplied) {
        $('#total-price').html(`<span style="text-decoration: line-through; font-size: 65%; margin-right: 4px;">${currencyFormatter(isYearly ? totalPrice/12 : totalPrice)}</span>${currencyFormatter(isYearly ? annualInvoiceEstimate/12 : monthlyInvoiceEstimate)}/month`);
      } else {
        $('#total-price').text(currencyFormatter(isYearly ? totalPrice/12 : totalPrice) + "/month");
      }
      $('#plan-summary-text').text(summaryText);
      $('#recommend-yearly').text(getSavingText());
      $('#total-seats').text(`Total number of seats: ${2 + +additionalUsers}`);
      const totalCostTitle = isYearly ? "Monthly Cost (Billed Annually)" : "Monthly Cost";
      $($('.total-cost-title')[0]).text(totalCostTitle);
    } catch(err) {
      console.log("err", err);
    }
  }

  async function applyCode() {
    await getInvoiceEstimates();
    await refreshCalculations();
    if (isCouponApplied) {
      $("#coupon-error").css("display", "none");
      $("#coupon-success").css("display", "block");
    } else {
      $("#coupon-error").css("display", "block");
      $("#coupon-success").css("display", "none");
    }
  }

  async function refreshPlanDetailsData() {
    const currency = $('#currency-select').val();
    showLoader();
    try {
      resp = await $.ajax({
        type: 'GET',
        url: baseUrl + '/v2/plan/details?currency=' + currency,
        contentType: "application/json",
        dataType: "json"
      });
      await refreshCalculations();
      updateDescriptions();
    } catch (error) {
      console.error(error);
      window.location.href = "/failure";
    } finally {
      hideLoader();
    }
  }

  refreshPlanDetailsData();

  // $('#period-checkbox').change(refreshCalculations);
  function changePlanPeriod(e) {
    activePeriod = e.target.innerText.toLowerCase();
    refreshCalculations();
  }
  $('.plan-button').click(changePlanPeriod);
  $('#launch-radio').change(refreshCalculations);
  $('#expand-radio').change(refreshCalculations);
  $('#growth-radio').change(refreshCalculations);
  $('#launch-additional-users').change(refreshCalculations);
  $('#expand-additional-users').change(refreshCalculations);
  $('#growth-additional-users').change(refreshCalculations);
  $('#apply-code').click(applyCode);

  $('#currency-select').change(refreshPlanDetailsData);

  $('#coupon-code-2').change(refreshCalculations);

  $('#lets-begin').click(function() {
    const { planId, selectedUsers, couponCode } = getInputData();
    let registerUrl = "/register?plan_id=" + planId + '&no_of_additional_users=' + selectedUsers;
    if (isCouponApplied) {
      registerUrl += "&coupon=" + couponCode;
    }
    if (window.location.pathname==="/achab-uk") {
      registerUrl += "&parent_account=achab_uk";
    }
    else if (window.location.pathname==="/achab-it") {
      registerUrl += "&parent_account=achab_it";
    }
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('tr_code')) {
      registerUrl += `&tr_code=${queryParams.get('tr_code')}`;
    }
    window.location.href = registerUrl;
  });
    
    
  });
