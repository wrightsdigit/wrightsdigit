/* Wrightsdigit — production frontend interactions */
const FORM_ENDPOINT = 'https://formsubmit.co/wrightsdigit@gmail.com';

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menuToggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const orderTabs = document.querySelectorAll('.order-type');
const orderPanels = document.querySelectorAll('.order-panel');
const orderModal = document.getElementById('order-modal');
const successPopup = document.getElementById('success-popup');
let lastFocusedElement = null;

function openOrder(target) {
  const tab = document.querySelector(`[data-order-target="${target}"]`);
  const panel = document.getElementById(target);
  if (!panel || !orderModal) return;
  lastFocusedElement = document.activeElement;
  orderTabs.forEach(item => item.classList.toggle('active', item === tab));
  orderPanels.forEach(item => item.classList.toggle('active', item === panel));
  orderModal.classList.add('is-open');
  orderModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  const heading = panel.querySelector('h3');
  if (heading) {
    const id = `${target}-title`;
    heading.id = id;
    orderModal.querySelector('.order-modal-dialog')?.setAttribute('aria-labelledby', id);
  }
  setTimeout(() => panel.querySelector('input,select,textarea')?.focus(), 120);
}

function closeOrder() {
  if (!orderModal) return;
  orderModal.classList.remove('is-open');
  orderModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  lastFocusedElement = null;
}

orderTabs.forEach(tab => tab.addEventListener('click', () => openOrder(tab.dataset.orderTarget)));
document.querySelectorAll('[data-close-order]').forEach(el => el.addEventListener('click', closeOrder));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeOrder();
    closeSuccess();
  }
  if (event.key === 'Tab' && orderModal?.classList.contains('is-open')) {
    const focusable = [...orderModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')].filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

document.querySelectorAll('[data-order-service]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const target = link.dataset.orderService;
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => openOrder(target), 450);
  });
});

function showSuccess(orderName) {
  if (!successPopup) return;
  const message = successPopup.querySelector('.success-popup-card span');
  if (message) message.textContent = orderName ? `“${orderName}” has been sent to Wrightsdigit. We’ll contact you shortly.` : 'Your order has been sent to Wrightsdigit. We’ll contact you shortly.';
  successPopup.classList.add('is-visible');
  successPopup.setAttribute('aria-hidden', 'false');
  window.clearTimeout(showSuccess.timer);
  showSuccess.timer = window.setTimeout(closeSuccess, 6500);
}
function closeSuccess() {
  successPopup?.classList.remove('is-visible');
  successPopup?.setAttribute('aria-hidden', 'true');
}
document.querySelectorAll('[data-close-success]').forEach(el => el.addEventListener('click', closeSuccess));

/* Submit FormSubmit forms in a hidden iframe so visitors stay on Wrightsdigit. */
const formSubmitFrameName = 'wrightsdigit-formsubmit-frame';
let pendingFormSubmission = null;
let formSubmitFrame = document.querySelector(`iframe[name="${formSubmitFrameName}"]`);
if (!formSubmitFrame) {
  formSubmitFrame = document.createElement('iframe');
  formSubmitFrame.name = formSubmitFrameName;
  formSubmitFrame.title = 'Form submission';
  formSubmitFrame.setAttribute('aria-hidden', 'true');
  formSubmitFrame.tabIndex = -1;
  formSubmitFrame.style.cssText = 'position:absolute;width:1px;height:1px;border:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);';
  document.body.appendChild(formSubmitFrame);
}
formSubmitFrame.addEventListener('load', () => {
  const pending = pendingFormSubmission;
  if (!pending) return;
  pendingFormSubmission = null;
  if (pending.kind === 'quote') {
    closeQuote();
    showSuccess(`Quote request — ${pending.name || 'Wrightsdigit'}`);
    if (pending.status) pending.status.textContent = 'Your quote request has been sent for processing.';
  } else {
    showSuccess(pending.name);
    if (pending.status) pending.status.textContent = 'Your request has been sent for processing.';
    closeOrder();
  }
  if (pending.submit) {
    pending.submit.disabled = false;
    pending.submit.classList.remove('is-loading');
    pending.submit.style.opacity = '';
  }
});

function keepFormOnWebsite(form, kind, submit, status, name) {
  const clientEmail = form.querySelector('input[type="email"][name="email"]')?.value.trim();
  let replyTo = form.querySelector('input[name="_replyto"]');
  if (!replyTo) {
    replyTo = document.createElement('input');
    replyTo.type = 'hidden';
    replyTo.name = '_replyto';
    form.appendChild(replyTo);
  }
  replyTo.value = clientEmail || '';
  form.target = formSubmitFrameName;
  form.action = FORM_ENDPOINT;
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  pendingFormSubmission = { kind, submit, status, name };
}

function setMinDates() {
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  document.querySelectorAll('input[type="date"]').forEach(input => input.min = iso);
}
setMinDates();

/* Native FormSubmit multipart uploads + 10 MB direct-upload validation. */
document.querySelectorAll('.order-provider-form').forEach(form => {
  const fileInput = form.querySelector('input[type="file"]');
  const fileHint = form.querySelector('.file-label span');
  const submit = form.querySelector('.submit-btn');
  const status = form.querySelector('.form-status');

  fileInput?.addEventListener('change', () => {
    const files = [...fileInput.files];
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > 10 * 1024 * 1024) {
      if (fileHint) { fileHint.textContent = 'Over 10 MB — use the cloud-link field below instead.'; fileHint.classList.add('file-too-large'); }
      fileInput.value = '';
      return;
    }
    if (fileHint) {
      fileHint.classList.remove('file-too-large');
      fileHint.textContent = files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Choose files or drag them here';
    }
  });

  form.addEventListener('submit', event => {
    const fileTotal = [...(fileInput?.files || [])].reduce((sum, file) => sum + file.size, 0);
    const cloudLink = form.querySelector('[name="cloud_link"]')?.value.trim();
    const cloudProvider = form.querySelector('[name="cloud_provider"]')?.value.trim();
    if (fileTotal > 10 * 1024 * 1024) {
      event.preventDefault();
      if (status) status.textContent = 'Your direct uploads are over 10 MB. Please use the Google Drive, Dropbox or OneDrive link field.';
      return;
    }
    if (cloudLink && !/^https?:\/\//i.test(cloudLink)) {
      event.preventDefault();
      if (status) status.textContent = 'Please enter a complete cloud-storage link beginning with https://';
      return;
    }
    if (cloudLink && !cloudProvider) {
      event.preventDefault();
      if (status) status.textContent = 'Please select the cloud-storage provider for your link.';
      return;
    }
    keepFormOnWebsite(form, 'order', submit, status, form.dataset.orderName || 'Order');
    if (submit) { submit.disabled = true; submit.classList.add('is-loading'); submit.style.opacity = '.75'; }
    if (status) status.textContent = 'Sending your request…';
  });
});

/* Separate pricing/quote forms: same fields as the order forms, but a distinct submission flow and confirmation. */
const quoteModal = document.getElementById('quote-modal');
const quoteContent = document.getElementById('quote-modal-content');
let quoteLastFocused = null;

function closeQuote(){
  if(!quoteModal) return;
  quoteModal.classList.remove('is-open');
  quoteModal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  if(quoteLastFocused && typeof quoteLastFocused.focus === 'function') quoteLastFocused.focus();
  quoteLastFocused=null;
}
document.querySelectorAll('[data-close-quote]').forEach(el=>el.addEventListener('click',closeQuote));

function attachQuoteForm(form){
  if(!form || form.dataset.quoteBound==='true') return;
  form.dataset.quoteBound='true';
  const fileInput=form.querySelector('input[type="file"]');
  const fileHint=form.querySelector('.file-label span');
  const submit=form.querySelector('.submit-btn');
  const status=form.querySelector('.form-status');
  fileInput?.addEventListener('change',()=>{
    const files=[...fileInput.files];
    const total=files.reduce((sum,file)=>sum+file.size,0);
    const max=10*1024*1024;
    if(total>max){
      fileHint.textContent='Over 10 MB — use the cloud-link field below instead.';
      fileHint.classList.add('file-too-large');
      fileInput.value='';
      return;
    }
    fileHint.classList.remove('file-too-large');
    fileHint.textContent=files.length?`${files.length} file${files.length===1?'':'s'} selected`:'Choose files or drag them here';
  });
  form.addEventListener('submit', event => {
    const fileTotal=[...(fileInput?.files||[])].reduce((sum,file)=>sum+file.size,0);
    const cloudLink=form.querySelector('[name="cloud_link"]')?.value.trim();
    const cloudProvider=form.querySelector('[name="cloud_provider"]')?.value.trim();
    if(fileTotal>10*1024*1024){event.preventDefault();if(status)status.textContent='Your direct uploads are over 10 MB. Please use the Google Drive, Dropbox or OneDrive link field.';return;}
    if(cloudLink && !/^https?:\/\//i.test(cloudLink)){event.preventDefault();if(status)status.textContent='Please enter a complete cloud-storage link beginning with https://';return;}
    if(cloudLink && !cloudProvider){event.preventDefault();if(status)status.textContent='Please select the cloud-storage provider for your link.';return;}
    keepFormOnWebsite(form, 'quote', submit, status, form.dataset.quoteName || 'Quote Request');
    if(submit){submit.disabled=true;submit.classList.add('is-loading');submit.style.opacity='.75';}
    if(status)status.textContent='Sending your quote request…';
  });
}

function openQuote(target){
  if(!quoteModal || !quoteContent) return;
  const source=document.getElementById(target);
  if(!source) return;
  quoteLastFocused=document.activeElement;
  quoteContent.innerHTML='';
  const panel=source.cloneNode(true);
  panel.removeAttribute('id');
  panel.classList.add('quote-selected');
  const form=panel.querySelector('form');
  if(!form) return;
  form.action='https://formsubmit.co/wrightsdigit@gmail.com';
  form.classList.remove('order-provider-form');
  form.classList.add('quote-provider-form');
  form.dataset.quoteName=source.dataset.orderName||source.querySelector('h3')?.textContent||'Quote Request';
  const subject=form.querySelector('[name="_subject"]');
  const orderType=form.querySelector('[name="order_type"]');
  if(subject) subject.value=`New Wrightsdigit Quote Request - ${form.dataset.quoteName}`;
  if(orderType){orderType.name='order_type';}
  let requestType=form.querySelector('[name="request_type"]');
  if(!requestType){requestType=document.createElement('input');requestType.type='hidden';requestType.name='request_type';form.prepend(requestType);}
  requestType.value='Quote Request';
  const heading=panel.querySelector('h3');
  if(heading){heading.textContent=heading.textContent.replace(/Order/i,'Quote Request');heading.id=`${target}-quote-title`;quoteModal.querySelector('.quote-modal-dialog')?.setAttribute('aria-labelledby',heading.id);}
  const intro=panel.querySelector('.panel-heading p');
  if(intro) intro.textContent='Send your artwork and project details. We’ll review everything and reply with your quote soon.';
  const button=panel.querySelector('.submit-btn');
  if(button) button.innerHTML='Get your quote <span>↗</span>';
  const status=panel.querySelector('.form-status');
  if(status) status.textContent='';
  quoteContent.appendChild(panel);
  attachQuoteForm(form);
  quoteModal.classList.add('is-open');
  quoteModal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  setTimeout(()=>panel.querySelector('input,select,textarea')?.focus(),120);
}

document.querySelectorAll('[data-quote-service]').forEach(link=>{
  link.addEventListener('click',event=>{
    event.preventDefault();
    const target=link.dataset.quoteService;
    document.getElementById('pricing')?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>openQuote(target),450);
  });
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    closeQuote();
  }
  if(event.key==='Tab' && quoteModal?.classList.contains('is-open')){
    const focusable=[...quoteModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')].filter(el=>el.offsetParent!==null);
    if(!focusable.length) return;
    const first=focusable[0], last=focusable[focusable.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  }
});