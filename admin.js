// admin.js
// Only load if on admin.html
document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname.split('/').pop().toLowerCase();
    if (currentPath !== 'admin.html') return;

    // Additional hard-guard protecting this page
    if (localStorage.getItem('isAdmin') !== 'true') {
        alert("Unauthorized. Admin access required.");
        window.location.href = 'index.html';
        return;
    }

    // Capture current admin email for multi-approval logic
    window.currentAdminEmail = null;
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
        window.currentAdminEmail = session.user.email;
    }

    // Bind initialization
    await loadUsers();
    await loadPendingLoans();
    await loadActiveLoans();
    await loadIppisRecordsAdmin();
    await loadRefundRequests();
    await loadDepositRequests();
    loadContributionsList();

    // Bind Edit Modal Submission immediately within DOM Context
    document.getElementById('userForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveUserBtn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            const email = document.getElementById('editUserEmail').value;
            const username = document.getElementById('editUserUsername').value;
            const phone = document.getElementById('editUserPhone').value;
            const nok = document.getElementById('editUserNOK').value;
            const address = document.getElementById('editUserAddress').value;
            const ippis = document.getElementById('editUserIppis').value;
            const account_number = document.getElementById('editUserAccountNumber').value;
            const member_id = document.getElementById('editUserMemberId').value;
            const isAdmin = document.getElementById('editUserIsAdmin').value === 'true';

            const balance = document.getElementById('editUserBalance').value;
            const savings = document.getElementById('editUserSavings').value;
            const shares = document.getElementById('editUserShares').value;
            const contributions = document.getElementById('editUserContributions').value;
            const status = document.getElementById('editUserStatus').value;

            const { error } = await supabase.from('users').update({
                username, phone, next_of_kin: nok, address, ippis_number: ippis, account_number, member_id, is_admin: isAdmin,
                balance, savings, shares, contributions, status
            }).eq('email', email);

            if (error) throw error;
            alert('User updated successfully!');
            closeUserModal();
            loadUsers();
        } catch (err) {
            alert('Error updating user: ' + err.message);
        } finally {
            btn.textContent = 'Save User Data';
            btn.disabled = false;
        }
    });
});

const formatNg = (val) => Number(val || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });

// ==============================
// USERS MANAGEMENT
// ==============================

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, username, phone, next_of_kin, address, ippis_number, account_number, member_id, balance, shares, contributions, status, is_admin');

        if (error) throw error;

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found.</td></tr>';
            return;
        }

        // Hide specific email per request
        const filteredUsers = users.filter(u => u.email !== 'diorbaron2@gmail.com');

        window.allAdminUsersLocalCache = filteredUsers; // Keep active list

        let html = '';
        filteredUsers.forEach((u, idx) => {
            const statusClass = 'status-' + (u.status || 'active');
            let accNo = u.account_number || 'N/A';
            html += `
                <tr>
                    <td>
                        <strong>${u.username || 'No Name'}</strong><br>
                        <small style="color: #666;">${u.email}</small>
                        ${u.is_admin ? '<br><span style="color: #FFD700; font-size: 0.8em;"><i class="fa-solid fa-star"></i> Admin</span>' : ''}
                    </td>
                    <td>
                        <small><strong>Phone:</strong> ${u.phone || 'N/A'}</small><br>
                        <small><strong>IPPIS:</strong> ${u.ippis_number || 'N/A'}</small><br>
                        <small><strong>Acc No:</strong> ${accNo}</small><br>
                        <small><strong>Member ID:</strong> ${u.member_id || 'N/A'}</small>
                    </td>
                    <td>
                        <small><strong>NOK:</strong> ${u.next_of_kin || 'N/A'}</small><br>
                        <small style="display:inline-block; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${u.address || 'N/A'}"><strong>Addr:</strong> ${u.address || 'N/A'}</small>
                    </td>
                    <td>
                        <small><strong>Bal:</strong> ${formatNg(u.balance)}</small><br>
                        <small><strong>Sav:</strong> ${formatNg(u.savings)}</small><br>
                        <small><strong>Inv:</strong> ${formatNg(u.shares)}</small><br>
                        <small><strong>Cont:</strong> ${formatNg(u.contributions)}</small>
                    </td>
                    <td><span class="status-badge ${statusClass}">${(u.status || 'active').toUpperCase()}</span></td>
                    <td>
                        <button class="btn-small btn-restore" onclick="openEditUserModalByIdx(${idx})"><i class="fa-solid fa-edit"></i> Edit</button>
                        <button class="btn-small btn-reject" onclick="deleteUserAccount('${u.email}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        loadContributionsList(); // Update bulk list whenever main users table updates
        loadSavingsList();

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:red;">Error: ${err.message}</td></tr>`;
    }
}

let originalContributionsForEdit = 0;
let originalSavingsForEdit = 0;
let originalSharesForEdit = 0;
let originalBalanceForEdit = 0;

window.openEditUserModalByIdx = function (idx) {
    if (!window.allAdminUsersLocalCache) return;
    const u = window.allAdminUsersLocalCache[idx];
    if (!u) return;

    originalContributionsForEdit = u.contributions || 0;
    originalSavingsForEdit = u.savings || 0;
    originalSharesForEdit = u.shares || 0;
    originalBalanceForEdit = u.balance || 0;

    document.getElementById('editUserEmail').value = u.email;
    document.getElementById('editUserUsername').value = u.username || '';
    document.getElementById('editUserPhone').value = u.phone || '';
    document.getElementById('editUserNOK').value = u.next_of_kin || '';
    document.getElementById('editUserAddress').value = u.address || '';
    document.getElementById('editUserIppis').value = u.ippis_number || '';
    document.getElementById('editUserAccountNumber').value = u.account_number || '';
    document.getElementById('editUserMemberId').value = u.member_id || '';
    document.getElementById('editUserIsAdmin').value = u.is_admin ? 'true' : 'false';

    document.getElementById('editUserBalance').value = originalBalanceForEdit;
    document.getElementById('editUserSavings').value = originalSavingsForEdit;
    document.getElementById('editUserShares').value = originalSharesForEdit;
    document.getElementById('editUserContributions').value = originalContributionsForEdit;
    document.getElementById('editUserStatus').value = u.status || 'active';
    document.getElementById('userModal').style.display = 'flex';
};

document.getElementById('editUserContributions')?.addEventListener('input', (e) => {
    const newCont = parseFloat(e.target.value) || 0;
    const diff = newCont - originalContributionsForEdit;

    document.getElementById('editUserSavings').value = (originalSavingsForEdit + (diff / 2)).toFixed(2);
    document.getElementById('editUserShares').value = (originalSharesForEdit + (diff / 2)).toFixed(2);
    document.getElementById('editUserBalance').value = (originalBalanceForEdit + diff).toFixed(2);
});

window.closeUserModal = function () {
    document.getElementById('userModal').style.display = 'none';
};

window.deleteUserAccount = async function (email) {
    if (!confirm(`WARNING: Are you absolutely sure you want to permanently delete the account for ${email}? This will erase all their associated data.`)) return;

    try {
        const { error } = await supabase.from('users').delete().eq('email', email);
        if (error) throw error;
        alert('User successfully deleted from public records.');
        loadUsers();
    } catch (err) {
        alert('Error deleting user: ' + err.message);
    }
};

// ==============================
// BULK CONTRIBUTIONS MANAGEMENT
// ==============================

function loadContributionsList() {
    const tbody = document.getElementById('contributionsTableBody');
    if (!tbody) return;

    const users = window.allAdminUsersLocalCache;
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No users found.</td></tr>';
        return;
    }

    let html = '';
    users.forEach((u) => {
        html += `
            <tr>
                <td>
                    <strong>${u.username || 'No Name'}</strong><br>
                    <small style="color: #666;">${u.email}</small>
                </td>
                <td>
                    <strong>${formatNg(u.contributions || 0)}</strong>
                </td>
                <td>
                    <input type="number" id="contributions_${u.id}" class="inline-input" style="width: 120px; padding: 5px; border-radius: 4px; border: 1px solid #ccc;" placeholder="Amount" step="0.01">
                </td>
                <td>
                    <button class="btn-small btn-approve" onclick="modifyUserContribution('${u.email}', 'contributions_${u.id}', true)"><i class="fa-solid fa-plus"></i> Add</button>
                    <button class="btn-small btn-reject" onclick="modifyUserContribution('${u.email}', 'contributions_${u.id}', false)"><i class="fa-solid fa-minus"></i> Deduct</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

window.modifyUserContribution = async function (email, inputId, isAdd) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    const amount = parseFloat(inputEl.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    const user = window.allAdminUsersLocalCache.find(u => u.email === email);
    if (!user) return;

    const actionText = isAdd ? "ADD" : "DEDUCT";
    if (!confirm(`Are you sure you want to ${actionText} ₦${amount.toLocaleString()} for ${email}'s contributions? (This will physically adjust their overall balances by ₦${amount.toLocaleString()}, split 50/50 into Savings & Investment).`)) return;

    try {
        const diff = isAdd ? amount : -amount;

        const newCont = Math.max(0, (user.contributions || 0) + diff);
        const newSavings = Math.max(0, (user.savings || 0) + (diff / 2));
        const newShares = Math.max(0, (user.shares || 0) + (diff / 2));
        const newBalance = Math.max(0, (user.balance || 0) + diff);

        const { error } = await supabase
            .from('users')
            .update({
                contributions: newCont,
                savings: newSavings,
                shares: newShares,
                balance: newBalance
            })
            .eq('email', email);

        if (error) throw error;

        await supabase.from('transactions').insert([{
            user_email: email,
            type: 'contribution',
            amount: amount,
            status: 'completed',
            reference: 'ADMIN_' + (isAdd ? 'ADD_' : 'DED_') + Math.floor(Math.random() * 100000000)
        }]);

        alert(`Successfully modified contributions and distributed funds for ${email}.`);
        inputEl.value = '';
        await loadUsers();
    } catch (err) {
        alert(`Error: ` + err.message);
        console.error(err);
    }
}

// ==============================
// BULK SAVINGS MANAGEMENT
// ==============================

function loadSavingsList() {
    const tbody = document.getElementById('savingsTableBody');
    if (!tbody) return;

    const users = window.allAdminUsersLocalCache;
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No users found.</td></tr>';
        return;
    }

    let html = '';
    users.forEach((u) => {
        html += `
            <tr>
                <td>
                    <strong>${u.username || 'No Name'}</strong><br>
                    <small style="color: #666;">${u.email}</small>
                </td>
                <td>
                    <strong>${formatNg(u.savings || 0)}</strong>
                </td>
                <td>
                    <input type="number" id="savings_${u.id}" class="inline-input" style="width: 120px; padding: 5px; border-radius: 4px; border: 1px solid #ccc;" placeholder="Amount" step="0.01">
                </td>
                <td>
                    <button class="btn-small btn-approve" onclick="modifyUserSavings('${u.email}', 'savings_${u.id}', true)"><i class="fa-solid fa-plus"></i> Add</button>
                    <button class="btn-small btn-reject" onclick="modifyUserSavings('${u.email}', 'savings_${u.id}', false)"><i class="fa-solid fa-minus"></i> Deduct</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

window.modifyUserSavings = async function (email, inputId, isAdd) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;

    const amount = parseFloat(inputEl.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    const user = window.allAdminUsersLocalCache.find(u => u.email === email);
    if (!user) return;

    const actionText = isAdd ? "ADD" : "DEDUCT";
    if (!confirm(`Are you sure you want to ${actionText} ₦${amount.toLocaleString()} for ${email}'s savings?`)) return;

    try {
        const diff = isAdd ? amount : -amount;

        const newSavings = Math.max(0, (user.savings || 0) + diff);
        const newBalance = Math.max(0, (user.balance || 0) + diff);

        const { error } = await supabase
            .from('users')
            .update({ savings: newSavings, balance: newBalance })
            .eq('email', email);

        if (error) throw error;

        await supabase.from('transactions').insert([{
            user_email: email,
            type: 'savings',
            amount: amount,
            status: 'completed',
            reference: 'ADMIN_' + (isAdd ? 'ADD_' : 'DED_') + Math.floor(Math.random() * 100000000)
        }]);

        alert(`Successfully modified savings for ${email}.`);
        inputEl.value = '';
        await loadUsers();
    } catch (err) {
        alert(`Error: ` + err.message);
        console.error(err);
    }
}

// ==============================
// DEPOSIT REQUESTS MANAGEMENT
// ==============================

async function loadDepositRequests() {
    const tbody = document.getElementById('depositRequestsTableBody');
    if (!tbody) return;

    try {
        const { data, error } = await supabase
            .from('deposit_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') {
                tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:red;">Database table "deposit_requests" not created yet. Run deposit-setup.sql.</td></tr>`;
                return;
            }
            throw error;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No deposit requests found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(req => {
            const dateStr = new Date(req.created_at).toLocaleString('en-US');
            const amt = parseFloat(req.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
            let statusBadge = '';
            if (req.status === 'pending') statusBadge = '<span class="status-badge status-pending">Pending</span>';
            else if (req.status === 'approved') statusBadge = '<span class="status-badge status-active">Approved</span>';
            else if (req.status === 'rejected') statusBadge = '<span class="status-badge status-banned">Rejected</span>';

            let actions = '';
            if (req.status === 'pending') {
                actions = `
                    <button class="btn-small btn-approve" onclick="approveDeposit('${req.id}', '${req.user_email}', '${req.type}', ${req.amount})">Confirm</button>
                    <button class="btn-small btn-reject" onclick="rejectDeposit('${req.id}')">Reject</button>
                `;
            }

            return `
                <tr>
                    <td>${req.user_email}</td>
                    <td><strong>${req.type.toUpperCase()}</strong><br>₦${amt}</td>
                    <td>${dateStr}</td>
                    <td>${statusBadge}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:red;">Error loading requests: ${err.message}</td></tr>`;
        console.error(err);
    }
}

window.approveDeposit = async function (id, email, type, amount) {
    if (!confirm(`Are you sure you want to approve this ${type} of ₦${amount} for ${email}?`)) return;

    try {
        let rpcName = '';
        if (type === 'deposit') rpcName = 'add_funds';
        else if (type === 'contribution') rpcName = 'add_contribution';
        else if (type === 'investment') rpcName = 'add_investment';
        else if (type === 'savings') rpcName = 'add_savings';

        if (!rpcName) throw new Error("Unknown deposit type");

        const { error: rpcError } = await supabase.rpc(rpcName, {
            user_email_param: email,
            amount_param: parseFloat(amount)
        });
        if (rpcError) throw rpcError;

        const { error: txError } = await supabase.from('transactions').insert([{
            user_email: email,
            type: type,
            amount: amount,
            reference: "MANUAL_" + id.split('-')[0],
            status: 'completed'
        }]);
        if (txError) throw txError;

        const { error: updError } = await supabase
            .from('deposit_requests')
            .update({ status: 'approved' })
            .eq('id', id);
        if (updError) throw updError;

        alert('Deposit confirmed successfully.');
        loadDepositRequests();
        loadUsers();
    } catch (err) {
        console.error('Error approving deposit:', err);
        alert('Error approving deposit: ' + err.message);
    }
}

window.rejectDeposit = async function (id) {
    if (!confirm('Are you sure you want to REJECT this deposit request?')) return;

    try {
        const { error } = await supabase
            .from('deposit_requests')
            .update({ status: 'rejected' })
            .eq('id', id);
        if (error) throw error;

        alert('Deposit rejected.');
        loadDepositRequests();
    } catch (err) {
        console.error('Error rejecting deposit:', err);
        alert('Error rejecting deposit: ' + err.message);
    }
}

// ==============================
// LOANS MANAGEMENT
// ==============================

async function loadPendingLoans() {
    const tbody = document.getElementById('loansTableBody');
    if (!tbody) return;

    try {
        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!loans || loans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No pending loan applications.</td></tr>';
            return;
        }

        let html = '';
        loans.forEach(loan => {
            const approvedBy = loan.approved_by || [];
            const approvalsCount = approvedBy.length;
            const hasApproved = window.currentAdminEmail && approvedBy.includes(window.currentAdminEmail);

            html += `
                <tr>
                    <td><small>${loan.user_email}</small></td>
                    <td>
                        <strong>${loan.loan_type}</strong><br>
                        ${formatNg(loan.amount)}
                    </td>
                    <td>
                        ${loan.duration_months} months<br>
                        <small>${loan.interest_rate}% Interest</small>
                    </td>
                    <td>
                        ${loan.evidence_url ? `<a href="${loan.evidence_url}" target="_blank"><img src="${loan.evidence_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;"></a>` : '<small style="color: #999;">No Image</small>'}
                    </td>
                    <td>
                        <div style="font-size: 0.85em; margin-bottom: 5px; color: #555;">Approvals: ${approvalsCount}/4</div>
                        <button class="btn-small btn-approve" onclick="resolveLoan('${loan.id}', '${loan.user_email}', ${loan.amount}, 'approved')" ${hasApproved ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>${hasApproved ? 'Approved' : 'Approve'}</button>
                        <button class="btn-small btn-reject" onclick="resolveLoan('${loan.id}', '${loan.user_email}', ${loan.amount}, 'rejected')">Reject</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:red;">Error: ${err.message}</td></tr>`;
    }
}

window.resolveLoan = async function (loanId, userEmail, amount, resolution) {
    if (!confirm(`Are you sure you want to ${resolution.toUpperCase()} this ₦${amount} loan for ${userEmail}?`)) return;

    try {
        const { error } = await supabase.rpc('admin_resolve_loan', {
            loan_id: loanId,
            user_email_param: userEmail,
            amount_param: parseFloat(amount),
            resolution: resolution
        });

        if (error) throw error;
        alert(`Loan successfully ${resolution}!`);
        loadPendingLoans(); // Refresh pending
        if (resolution === 'approved') loadActiveLoans(); // Refresh active
    } catch (err) {
        alert(`Failed to ${resolution} loan: ` + err.message);
    }
};

// ==============================
// ACTIVE LOANS MANAGEMENT
// ==============================

async function loadActiveLoans() {
    const tbody = document.getElementById('activeLoansTableBody');
    if (!tbody) return;

    try {
        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!loans || loans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No active loans right now.</td></tr>';
            return;
        }

        let html = '';
        loans.forEach(loan => {
            html += `
                <tr>
                    <td><small>${loan.user_email}</small></td>
                    <td>
                        <strong>${loan.loan_type}</strong><br>
                        ${formatNg(loan.amount)}
                    </td>
                    <td>
                        <small>Monthly: <strong>${formatNg(loan.monthly_repayment_amount)}</strong></small><br>
                        <small>Remaining: <strong>${formatNg(loan.remaining_balance)}</strong></small><br>
                        ${loan.duration_months} months<br>
                        <small>${loan.interest_rate}% Interest</small>
                    </td>
                    <td>
                        ${loan.evidence_url ? `<a href="${loan.evidence_url}" target="_blank"><img src="${loan.evidence_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;"></a>` : '<small style="color: #999;">No Image</small>'}
                    </td>
                    <td>
                        <button class="btn-small btn-restore" onclick="clearLoan('${loan.id}', '${loan.user_email}')">Mark Cleared</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:red;">Error: ${err.message}</td></tr>`;
    }
}

window.clearLoan = async function (loanId, userEmail) {
    if (!confirm(`Are you sure you want to mark this loan as CLEARED for ${userEmail}? This will wipe it from their owed balance.`)) return;

    try {
        const { error } = await supabase.rpc('admin_clear_loan', {
            loan_id: loanId
        });

        if (error) throw error;
        alert(`Loan successfully cleared!`);
        loadActiveLoans(); // Refresh list
    } catch (err) {
        alert(`Failed to clear loan: ` + err.message);
    }
};

window.processMonthlyLoans = async function () {
    if (!confirm(`Are you sure you want to run the monthly loan deduction process? This will deduct monthly repayments from all active borrowers' balances and add them to their contributions.`)) return;

    try {
        const { error } = await supabase.rpc('process_monthly_loan_repayments');

        if (error) throw error;
        alert(`Monthly loan repayments processed successfully!`);
        loadActiveLoans(); // Refresh list to show new balances
        loadUsers(); // Refresh users list to show new balances
    } catch (err) {
        alert(`Failed to process monthly loans: ` + err.message);
    }
};

// ==============================
// SHOP MANAGEMENT
// ==============================

// Run this on init along with others
document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname.split('/').pop().toLowerCase();
    if (currentPath === 'admin.html') {
        await loadShopItems();
    }
});

async function loadShopItems() {
    const tbody = document.getElementById('shopItemsTableBody');
    if (!tbody) return;

    try {
        const { data: items, error } = await supabase
            .from('shop_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No shop items yet.</td></tr>';
            return;
        }

        let html = '';
        items.forEach(item => {
            const imgHtml = item.image_url
                ? `<img src="${item.image_url}" class="item-image-preview">`
                : `<div style="width:60px; height:60px; background:#eee; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#999;"><i class="fa-solid fa-image"></i></div>`;

            html += `
                <tr>
                    <td>${imgHtml}</td>
                    <td><strong>${item.name}</strong></td>
                    <td>${formatNg(item.price)}</td>
                    <td>
                        <button class="btn-small btn-restore" onclick='editShopItem(${JSON.stringify(item).replace(/'/g, "&#39;")})'><i class="fa-solid fa-edit"></i> Edit</button>
                        <button class="btn-small btn-reject" onclick="deleteShopItem('${item.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:red;">Error: ${err.message}</td></tr>`;
    }
}

// Modal Logic
function openShopModal() {
    document.getElementById('shopModal').style.display = 'flex';
}

function closeShopModal() {
    document.getElementById('shopModal').style.display = 'none';
    document.getElementById('shopForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('modalTitle').textContent = 'Add New Item';
    document.getElementById('imagePreview').style.display = 'none';
}

// Image Preview
document.getElementById('itemImage')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            preview.src = evt.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
    }
});

// Edit Button Click
window.editShopItem = function (item) {
    document.getElementById('modalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;

    const preview = document.getElementById('imagePreview');
    if (item.image_url) {
        preview.src = item.image_url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    openShopModal();
};

// Form Save (Add or Update)
document.getElementById('shopForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveShopBtn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const id = document.getElementById('itemId').value;
        const name = document.getElementById('itemName').value;
        const price = parseFloat(document.getElementById('itemPrice').value);
        const fileInput = document.getElementById('itemImage');
        const file = fileInput.files[0];

        let imageUrl = null;

        // If editing and no new file, keep existing image logic handled via DB omitting or we just fetch current
        if (id && !file) {
            const { data: currentItem } = await supabase.from('shop_items').select('image_url').eq('id', id).single();
            if (currentItem) imageUrl = currentItem.image_url;
        }

        // Upload new image if provided
        if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `items/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('shop-items').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('shop-items').getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
        }

        if (id) {
            // Update existing
            const { error } = await supabase
                .from('shop_items')
                .update({ name, price, image_url: imageUrl })
                .eq('id', id);
            if (error) throw error;
            alert('Item updated successfully!');
        } else {
            // Insert new
            const { error } = await supabase
                .from('shop_items')
                .insert([{ name, price, image_url: imageUrl }]);
            if (error) throw error;
            alert('Item added successfully!');
        }

        closeShopModal();
        loadShopItems();

    } catch (err) {
        alert('Error saving item: ' + err.message);
    } finally {
        btn.textContent = 'Save Item';
        btn.disabled = false;
    }
});

// Delete Item
window.deleteShopItem = async function (id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        // Technically we should delete the image from storage too for cleanup
        const { data: item } = await supabase.from('shop_items').select('image_url').eq('id', id).single();

        if (item && item.image_url) {
            // Extract file path from public URL
            // URL format typically: .../storage/v1/object/public/shop-items/items/1234.png
            const urlParts = item.image_url.split('/shop-items/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1];
                await supabase.storage.from('shop-items').remove([filePath]);
            }
        }

        const { error } = await supabase.from('shop_items').delete().eq('id', id);
        if (error) throw error;

        alert('Item deleted successfully!');
        loadShopItems();
    } catch (err) {
        alert('Error deleting item: ' + err.message);
    }
};

// ==============================
// IPPIS RECORDS MANAGEMENT
// ==============================

// Format Date string for IPPIS
function formatPayMonth(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

async function loadIppisRecordsAdmin() {
    const tbody = document.getElementById('ippisRecordsTableBodyAdmin');
    if (!tbody) return;

    try {
        const { data, error } = await supabase
            .from('ippis_records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No IPPIS records found.</td></tr>';
            return;
        }

        // Store data for export
        window.adminIppisRecords = data;

        let html = '';
        data.forEach(record => {
            html += `
                <tr>
                    <td><strong>${record.first_name} ${record.last_name}</strong></td>
                    <td>${record.ippis_number || '-'}</td>
                    <td>${record.grade_level || '-'}/${record.step || '-'}</td>
                    <td style="color: #2e7d32; font-weight: 600;">${formatNg(record.net_salary)}</td>
                    <td>${formatPayMonth(record.pay_month)}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (err) {
        console.error('Error loading IPPIS records:', err);
        if (err.code === '42P01') {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color:red;">Table "ippis_records" not found. Please setup database.</td></tr>';
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="color:red;">Error: ${err.message}</td></tr>`;
        }
    }
}

// Handle CSV Export for Admin
document.getElementById('exportIppisBtnAdmin')?.addEventListener('click', () => {
    const records = window.adminIppisRecords;

    if (!records || records.length === 0) {
        alert('No records available to export.');
        return;
    }

    // Generate CSV content: IPPIS_NO,NAME,GL,STEP,BANK,ACCOUNT,SALARY
    const headers = ['IPPIS_NO', 'NAME', 'GL', 'STEP', 'BANK', 'ACCOUNT', 'SALARY'];
    const rows = records.map(r => [
        r.ippis_number || '',
        `"${r.first_name} ${r.last_name}"`, // Quote to handle names with commas
        r.grade_level || '',
        r.step || '',
        `"${r.bank_name || ''}"`, // Quote banks
        `'${r.account_number || ''}`, // Prepend quote to force string in Excel
        r.net_salary || 0
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    // Generate filename with current month/date
    const date = new Date();
    const filenameDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    link.setAttribute('download', `IPPIS_Export_${filenameDate}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// ==============================
// REFUNDS MANAGEMENT
// ==============================

async function loadRefundRequests() {
    const tbody = document.getElementById('refundsTableBody');
    if (!tbody) return;

    try {
        const { data: refunds, error } = await supabase
            .from('refunds')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!refunds || refunds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No refund requests found.</td></tr>';
            return;
        }

        let html = '';
        refunds.forEach(req => {
            const statusClass = req.status === 'resolved' ? 'status-active' : 'status-pending';
            html += `
                <tr>
                    <td><strong>${req.user_email}</strong><br><small>${new Date(req.created_at).toLocaleDateString()}</small></td>
                    <td style="max-width: 250px; white-space: pre-wrap; font-size: 0.9em;">${req.message}</td>
                    <td>
                        <span class="status-badge ${statusClass}" style="margin-bottom: 5px; display: inline-block;">${req.status.toUpperCase()}</span><br>
                        ${req.image_url ? `<a href="${req.image_url}" target="_blank"><img src="${req.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;"></a>` : '<small style="color: #999;">No Image</small>'}
                    </td>
                    <td>
                        ${req.status === 'pending' ? `<button class="btn-small btn-restore" onclick="resolveRefund('${req.id}', '${req.user_email}')">Mark Resolved</button>` : '<small style="color: green;"><i class="fa-solid fa-check"></i> Resolved</small>'}
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="color:red;">Error: ${err.message}</td></tr>`;
    }
}

window.resolveRefund = async function (refundId, userEmail) {
    if (!confirm(`Are you sure you want to mark this refund for ${userEmail} as RESOLVED?`)) return;

    const amountStr = prompt(`Enter the amount to refund to ${userEmail}:`);
    if (amountStr === null) return; // User cancelled

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid refund amount.");
        return;
    }

    try {
        const { error } = await supabase.rpc('admin_resolve_refund', {
            refund_id: refundId,
            amount_param: amount
        });

        // Also add a transaction record for the refund
        const { error: txError } = await supabase.from('transactions').insert([{
            user_email: userEmail,
            type: 'refund',
            amount: amount,
            reference: "REFUND_" + refundId.split('-')[0],
            status: 'completed'
        }]);

        if (error) throw error;
        if (txError) console.error("Could not log transaction, but refund completed.", txError);

        alert(`Refund of ₦${amount.toLocaleString()} successfully marked as resolved and added to user balance!`);
        loadRefundRequests(); // Refresh list
        if (typeof loadUsers === 'function') loadUsers(); // Refresh user balances if visible
    } catch (err) {
        alert(`Failed to resolve refund: ` + err.message);
    }
};
