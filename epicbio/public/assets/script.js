const supabase = Supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY');

let translations = {};

async function loadTranslations(lang = 'en') {
  const response = await fetch('/assets/translations.json');
  translations = await response.json();
  const currentTranslations = translations[lang] || translations['en'];
  document.querySelectorAll('[data-translate]').forEach(el => {
    el.textContent = currentTranslations[el.dataset.translate] || el.textContent;
  });
}

async function loadBio() {
  const username = window.location.pathname.split('/')[1];
  const { data: bio } = await supabase.from('bios').select('*').eq('username', username).single();
  if (!bio) {
    document.body.innerHTML = '<p>Bio not found</p>';
    return;
  }
  await supabase.from('bios').update({ views: (bio.views || 0) + 1 }).eq('id', bio.id);
  document.getElementById('username').textContent = bio.username;
  document.getElementById('bio-content').innerHTML = bio.bio_content || '';
  if (bio.video_url) {
    document.getElementById('video-embed').innerHTML = `<iframe src="https://www.youtube.com/embed/${bio.video_url.split('v=')[1]}" style="max-width: 100%; aspect-ratio: 16/9;"></iframe>`;
  }
  const links = bio.links || [];
  document.getElementById('links').innerHTML = links.map(link => `
    <div class="link-card">
      <a href="${link.url}" target="_blank">${link.title}</a>
      <p>${link.description || ''}</p>
    </div>
  `).join('');
  const { data: user } = await supabase.auth.getUser();
  if (user && user.user.user_metadata.username === username) {
    document.getElementById('edit-link').style.display = 'block';
    document.getElementById('dashboard-link').style.display = 'block';
  }
  if (bio.use_ig_profile) {
    const response = await fetch('/api/verify-ig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ igUsername: bio.username })
    });
    const { profilePicUrl } = await response.json();
    if (profilePicUrl) {
      const img = document.getElementById('profile-pic');
      img.src = profilePicUrl;
      img.style.display = 'block';
    }
  }
  const ctaLink = document.querySelector('.cta');
  if (ctaLink) {
    ctaLink.href = `/signup?ref=${username}`;
  }
  const mode = localStorage.getItem('bioMode') || 'long-form';
  toggleMode(mode);
}

function toggleMode(mode = null) {
  const button = document.getElementById('toggle-mode');
  const body = document.body;
  const currentMode = mode || (body.classList.contains('simple-link-mode') ? 'long-form' : 'simple-link-mode');
  if (currentMode === 'simple-link-mode') {
    body.classList.add('simple-link-mode');
    button.textContent = translations[document.documentElement.lang || 'en'].toggle_simple || 'Switch to Simple Link Mode';
  } else {
    body.classList.remove('simple-link-mode');
    button.textContent = translations[document.documentElement.lang || 'en'].toggle_long_form || 'Switch to Long-Form Bio Mode';
  }
  localStorage.setItem('bioMode', currentMode);
}

function addLink() {
  const container = document.getElementById('links-container');
  const linkInput = document.createElement('div');
  linkInput.className = 'link-input';
  linkInput.innerHTML = `
    <input type="text" placeholder="Link Title">
    <input type="url" placeholder="Link URL" pattern="https://.*">
    <input type="text" placeholder="Link Description">
    <button type="button" onclick="removeLink(this)">Remove</button>
  `;
  container.appendChild(linkInput);
}

function removeLink(button) {
  button.parentElement.remove();
}

async function loadEditForm() {
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/';
    return;
  }
  const { data: bio } = await supabase.from('bios').select('*').eq('userId', user.user.id).single();
  if (bio) {
    document.getElementById('username').value = bio.username;
    document.getElementById('bio-content').value = bio.bio_content || '';
    document.getElementById('video-url').value = bio.video_url || '';
    document.getElementById('use-ig-profile').checked = bio.use_ig_profile || false;
    const linksContainer = document.getElementById('links-container');
    linksContainer.innerHTML = '';
    (bio.links || []).forEach(link => {
      const linkInput = document.createElement('div');
      linkInput.className = 'link-input';
      linkInput.innerHTML = `
        <input type="text" value="${link.title}" placeholder="Link Title">
        <input type="url" value="${link.url}" placeholder="Link URL" pattern="https://.*">
        <input type="text" value="${link.description || ''}" placeholder="Link Description">
        <button type="button" onclick="removeLink(this)">Remove</button>
      `;
      linksContainer.appendChild(linkInput);
    });
  }
  const { data: subscription } = await supabase.from('subscriptions').select('active').eq('userId', user.user.id).single();
  const igBackgroundInput = document.getElementById('ig-background-url');
  if (subscription?.active) {
    igBackgroundInput.disabled = false;
  }
}

async function saveBio(event) {
  event.preventDefault();
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/';
    return;
  }
  const username = document.getElementById('username').value;
  const bioContent = document.getElementById('bio-content').value;
  const videoUrl = document.getElementById('video-url').value;
  const useIgProfile = document.getElementById('use-ig-profile').checked;
  const links = Array.from(document.querySelectorAll('.link-input')).map(div => ({
    title: div.querySelector('input:nth-child(1)').value,
    url: div.querySelector('input:nth-child(2)').value,
    description: div.querySelector('input:nth-child(3)').value
  }));
  const { data: subscription } = await supabase.from('subscriptions').select('active').eq('userId', user.user.id).single();
  const igBackgroundUrl = subscription?.active ? document.getElementById('ig-background-url').value : '';
  await supabase.from('bios').upsert({
    userId: user.user.id,
    username,
    bio_content: bioContent,
    video_url: videoUrl,
    links,
    use_ig_profile: useIgProfile,
    ig_background_url: igBackgroundUrl
  });
  window.location.href = `/dashboard`;
}

async function loadDashboard() {
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/';
    return;
  }
  const { data: bio } = await supabase.from('bios').select('username, purchased').eq('userId', user.user.id).single();
  document.getElementById('bio-link').textContent = bio ? `Your bio: epicbio.io/${bio.username}` : 'No bio created';
  document.getElementById('purchase-status').textContent = bio && bio.purchased ? 'Purchased' : 'Not Purchased';
  if (user.user.user_metadata.role === 'admin') {
    document.getElementById('admin-link').style.display = 'block';
  }
}

async function signup(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const igUsername = document.getElementById('ig-username').value;
  const password = document.getElementById('password').value;
  const inviteCode = document.getElementById('invite-code').value;
  const { data: invite } = await supabase.from('invites').select('*').eq('code', inviteCode).eq('used', false).single();
  if (!invite) {
    alert('Invalid or used invite code');
    return;
  }
  const { data: user, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { ig_username: igUsername, username: igUsername, role: 'user' } }
  });
  if (error) {
    alert('Signup error: ' + error.message);
    return;
  }
  await supabase.from('invites').update({ used: true }).eq('code', inviteCode);
  const response = await fetch('/api/bio/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.user.id })
  });
  const { sessionId } = await response.json();
  await stripe.redirectToCheckout({ sessionId });
}

async function generateInviteCode(event) {
  event.preventDefault();
  const email = document.getElementById('invite-email').value;
  const igUsername = document.getElementById('invite-ig-username').value;
  const { data: existing } = await supabase.from('invites').select('*').eq('email', email).single();
  if (existing) {
    document.getElementById('invite-code').textContent = `Invite code for ${email} (@${igUsername}): ${existing.code}`;
    return;
  }
  const code = crypto.randomUUID();
  await supabase.from('invites').insert({ email, code, used: false, username: igUsername });
  document.getElementById('invite-code').textContent = `Invite code for ${email} (@${igUsername}): ${code}`;
}

async function saveSettings() {
  const enableTemplates = document.getElementById('enable-templates').checked;
  await supabase.from('settings').upsert({ id: 1, enable_templates: enableTemplates });
  alert('Settings saved');
}

async function loadAdmin() {
  const { data: user } = await supabase.auth.getUser();
  if (!user || user.user.user_metadata.role !== 'admin') {
    window.location.href = '/';
    return;
  }
  const { data: stats } = await supabase.from('bios').select('id, views, purchased');
  document.getElementById('total-users').textContent = stats.length;
  document.getElementById('total-views').textContent = stats.reduce((sum, bio) => sum + (bio.views || 0), 0);
  document.getElementById('total-purchases').textContent = stats.filter(bio => bio.purchased).length;
  const { data: settings } = await supabase.from('settings').select('enable_templates').eq('id', 1).single();
  document.getElementById('enable-templates').checked = settings?.enable_templates || false;
}

if (window.location.pathname === '/') {
  document.getElementById('signup-form')?.addEventListener('submit', signup);
} else if (window.location.pathname === '/edit') {
  loadEditForm();
  document.getElementById('edit-form').addEventListener('submit', saveBio);
} else if (window.location.pathname === '/dashboard') {
  loadDashboard();
} else if (window.location.pathname === '/admin') {
  loadAdmin();
  document.getElementById('invite-form').addEventListener('submit', generateInviteCode);
} else if (window.location.pathname.match(/^\/[a-zA-Z0-9_-]+$/)) {
  loadBio();
}

loadTranslations();