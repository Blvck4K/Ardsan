// shared.js
// Supabase Configuration
const SUPABASE_URL = 'https://rpulgzbhilmwkzlxqvml.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwdWxnemJoaWxtd2t6bHhxdm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDYzNjUsImV4cCI6MjA4ODEyMjM2NX0.aUqFAVTb5Tw5AU1H8XXcE4dfydg118KYgNFPlsD54MM';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Fetch and display user name
async function showUserName(elementId = 'userName') {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const nameEl = document.getElementById(elementId);

    if (user && user.email) {
        const { data, error } = await supabase
            .from('users')
            .select('username, profile_photo')
            .eq('email', user.email)
            .single();

        const displayName = data && data.username ? data.username : user.email;
        if (nameEl) nameEl.textContent = displayName;

        // Store first initial for text avatar safely
        let initial = 'U';
        if (displayName && displayName.trim().length > 0) {
            initial = displayName.trim().charAt(0).toUpperCase();
        }
        localStorage.setItem('userInitial', initial);

        // Process generic photo logic
        if (data && data.profile_photo) {
            localStorage.setItem('profilePhotoUrl', data.profile_photo);
        } else {
            localStorage.removeItem('profilePhotoUrl');
        }
        updateProfilePhotos();
    } else {
        if (nameEl) nameEl.textContent = 'Guest';
        localStorage.setItem('userInitial', 'G');
        updateProfilePhotos();
    }
}

// Fetch and display balance
async function showBalance(elementId = 'home-balance-value') {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    const balanceEl = document.getElementById(elementId);

    if (user && user.email) {
        const { data, error } = await supabase
            .from('users')
            .select('balance, savings, shares, contributions')
            .eq('email', user.email)
            .single();

        // Fetch total loans (approved only)
        const { data: loansData } = await supabase.from('loans').select('amount').eq('user_email', user.email).eq('status', 'approved');
        const totalLoans = loansData ? loansData.reduce((acc, curr) => acc + Number(curr.amount), 0) : 0;

        // Fetch total purchases
        const { data: purchasesData } = await supabase.from('purchases').select('amount').eq('user_email', user.email);
        const totalPurchases = purchasesData ? purchasesData.reduce((acc, curr) => acc + Number(curr.amount), 0) : 0;

        let balanceValue = (data && data.balance != null) ? data.balance : 0;
        let savingsValue = (data && data.savings != null) ? data.savings : 0;
        let sharesValue = (data && data.shares != null) ? data.shares : 0;
        let contributionsValue = (data && data.contributions != null) ? data.contributions : 0;

        // Use 'en-US' without currency to get pure formatted numbers
        const formatNg = (val) => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const formattedBalance = formatNg(balanceValue);
        localStorage.setItem('userBalance', formattedBalance);
        localStorage.setItem('userSavings', formatNg(savingsValue));
        localStorage.setItem('userShares', formatNg(sharesValue));
        localStorage.setItem('userContributions', formatNg(contributionsValue));
        localStorage.setItem('userLoans', formatNg(totalLoans));
        localStorage.setItem('userPurchases', formatNg(totalPurchases));

        if (balanceEl && !balanceEl.dataset.hidden) {
            balanceEl.innerHTML = formattedBalance;
        }
        updateDashboardCards();
    } else if (balanceEl) {
        balanceEl.innerHTML = localStorage.getItem('userBalance') || '₦0.00';
        updateDashboardCards();
    }
}

function updateDashboardCards() {
    const savingsEl = document.getElementById('dashboard-savings');
    if (savingsEl) savingsEl.textContent = '₦' + (localStorage.getItem('userSavings') || '0.00');

    const loansEl = document.getElementById('dashboard-loans');
    if (loansEl) loansEl.textContent = '₦' + (localStorage.getItem('userLoans') || '0.00');

    const purchasesEl = document.getElementById('dashboard-purchases');
    if (purchasesEl) purchasesEl.textContent = '₦' + (localStorage.getItem('userPurchases') || '0.00');

    const sharesEl = document.getElementById('dashboard-shares');
    if (sharesEl) sharesEl.textContent = '₦' + (localStorage.getItem('userShares') || '0.00');

    const contributionsEl = document.getElementById('dashboard-contributions');
    if (contributionsEl) contributionsEl.textContent = '₦' + (localStorage.getItem('userContributions') || '0.00');

    // Also update dedicated page specific elements to prevent race conditions
    const invBal = document.getElementById('investment-balance');
    if (invBal) invBal.textContent = localStorage.getItem('userShares') || '0.00';

    const contBal = document.getElementById('contribution-balance');
    if (contBal) contBal.textContent = localStorage.getItem('userContributions') || '0.00';

    const savBalDisplay = document.getElementById('savings-balance-display');
    if (savBalDisplay) savBalDisplay.textContent = '₦' + (localStorage.getItem('userSavings') || '0.00');
}

// Ensure all profile images dynamically toggle between Text Avatar and Photo
function updateProfilePhotos() {
    const url = localStorage.getItem('profilePhotoUrl');
    const initial = localStorage.getItem('userInitial') || 'U';

    // Elements to toggle
    const textAvatars = [
        document.getElementById('navProfilePic'),
        document.getElementById('menuProfilePic'),
        document.getElementById('editProfilePic')
    ];
    const imageAvatars = [
        document.getElementById('navProfileImg'),
        document.getElementById('menuProfileImg'),
        document.getElementById('profilePhoto')
    ];

    if (url) {
        // Show real images
        textAvatars.forEach(el => { if (el) el.style.setProperty('display', 'none', 'important'); });
        imageAvatars.forEach(el => {
            if (el) {
                el.src = url;
                // Specific sizing/display logic for the edit page
                if (el.id === 'profilePhoto') {
                    el.style.display = 'block';
                } else {
                    el.style.display = 'inline-block';
                }
            }
        });
    } else {
        // Show text initials
        imageAvatars.forEach(el => { if (el) el.style.display = 'none'; });
        textAvatars.forEach(el => {
            if (el) {
                el.textContent = initial;
                el.style.display = 'flex'; // Uses flex for centering
            }
        });
    }
}

// Dynamic Bottom Navigation Injection
function injectBottomNav() {
    // Only inject on pages that need it (not auth, edit, shop, withdrawal)
    const currentPath = window.location.pathname.split('/').pop().toLowerCase();
    const noNavPages = ['auth.html', 'edit.html', 'shop.html', 'withdrawal.html'];

    // If it's a no-nav page (or we already have a nav hardcoded), skip injection
    if (noNavPages.includes(currentPath) || document.querySelector('.bottom-nav')) return;

    const navHTML = `
        <div class="bottom-nav">
            <a href="index.html" class="nav-item ${currentPath === 'index.html' || currentPath === '' ? 'active' : ''}">
                <i class="fa-solid fa-house"></i> Home
            </a>
            <a href="request-loan.html" class="nav-item ${currentPath === 'request-loan.html' ? 'active' : ''}">
                <i class="fa-solid fa-money-bill-wave"></i> Get Loan
            </a>
            <a href="mobile-pos.html" class="nav-item ${currentPath === 'mobile-pos.html' ? 'active' : ''}">
                <i class="fa-solid fa-building-columns"></i> Deposit
            </a>
            <a href="menu.html" class="nav-item ${currentPath === 'menu.html' ? 'active' : ''}">
                <i class="fa-solid fa-bars"></i> Menu
            </a>
        </div>
    `;

    // Wrap the app in a container if it isn't already, or just append 
    const appEl = document.querySelector('.app');
    if (appEl) {
        appEl.insertAdjacentHTML('beforeend', navHTML);
    } else {
        document.body.insertAdjacentHTML('beforeend', navHTML);
    }
}

// Handle Logout
function handleLogout(e) {
    if (e) e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    if (supabase) {
        supabase.auth.signOut().then(() => {
            window.location.href = 'auth.html';
        });
    } else {
        window.location.href = 'auth.html';
    }
}

// Check Admin Status (exposes UI elements)
async function checkAdminStatus() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
        const { data: dbUser } = await supabase.from('users').select('is_admin').eq('email', user.email).single();
        if (dbUser && dbUser.is_admin) {
            localStorage.setItem('isAdmin', 'true');
            const adminLink = document.getElementById('admin-panel-link');
            if (adminLink) adminLink.style.display = 'block';
        } else {
            localStorage.removeItem('isAdmin');
        }
    }
}

// Initialization on DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {

    // Auth Guarding Logic
    const currentPath = window.location.pathname.split('/').pop().toLowerCase();

    if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        // If not logged in and not on auth page -> redirect to auth
        if (!user && currentPath !== 'auth.html' && currentPath !== 'setup.html') {
            window.location.href = 'auth.html';
            return; // Stop execution on secure pages
        }

        if (user) {
            // Check their status in the DB
            const { data: dbUser, error } = await supabase
                .from('users')
                .select('status')
                .eq('email', user.email)
                .single();

            if (dbUser) {
                if (dbUser.status === 'banned' || dbUser.status === 'deactivated') {
                    alert(`Your account is currently ${dbUser.status}. Please contact support.`);
                    handleLogout(); // Force logout
                    return;
                }
            }

            // If logged in (and active) and on auth page -> redirect to dashboard
            if (currentPath === 'auth.html') {
                window.location.href = 'index.html';
                return;
            }
        }
    }

    // 1. Inject Nav
    injectBottomNav();

    // 2. Load Profile Photos
    updateProfilePhotos();

    // 3. Expose Admin Links (if applicable)
    checkAdminStatus();

    // 3. Setup Eye Toggle for balances
    const eyeToggle = document.getElementById('home-eye-toggle') || document.getElementById('eye-toggle');
    const balanceEl = document.getElementById('home-balance-value') || document.getElementById('balance-value');

    if (eyeToggle && balanceEl) {
        // Set initial state
        balanceEl.dataset.hidden = 'false';

        eyeToggle.addEventListener('click', () => {
            const isHidden = balanceEl.dataset.hidden === 'true';
            const eyeIcon = eyeToggle.querySelector('i');

            if (isHidden) {
                // Reveal
                balanceEl.innerHTML = localStorage.getItem('userBalance') || '₦0.00';
                eyeIcon.classList.remove('fa-eye-slash');
                eyeIcon.classList.add('fa-eye');
                balanceEl.dataset.hidden = 'false';
            } else {
                // Hide
                balanceEl.innerHTML = '••••••••••';
                eyeIcon.classList.remove('fa-eye');
                eyeIcon.classList.add('fa-eye-slash');
                balanceEl.dataset.hidden = 'true';
            }
        });
    }

    // 4. Setup Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // 5. Fetch Data (if we are not on the auth page)
    if (currentPath !== 'auth.html') {
        showUserName();
        showBalance('home-balance-value');
        showBalance('balance-value'); // For menu page
    }
});
