const API_BASE = '';

let currentUser = null;

async function api(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const token = localStorage.getItem('pharmatrace_token');
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE + path, {
        headers,
        credentials: 'include',
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Request failed. Please try again.');
    }

    return data;
}

function showMessage(element, message, type = 'error') {
    if (!element) return;
    element.textContent = message;
    element.className = 'alert ' + (type === 'success' ? 'alert-success' : 'alert-error');
    element.style.display = 'block';
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Manufactured':
            return 'status-badge status-manufactured';
        case 'Received':
            return 'status-badge status-received';
        case 'In Stock':
            return 'status-badge status-in-stock';
        case 'Sold':
            return 'status-badge status-sold';
        case 'Recalled':
            return 'status-badge status-recalled';
        default:
            return 'status-badge status-in-stock';
    }
}

async function fetchCurrentUser() {
    try {
        const data = await api('/api/auth/me');
        currentUser = data.user;
        localStorage.setItem('pharmatrace_user', JSON.stringify(currentUser));
        return currentUser;
    } catch {
        const cached = getCachedUser();
        const token = localStorage.getItem('pharmatrace_token');
        if (cached && token) {
            currentUser = cached;
            return currentUser;
        }
        currentUser = null;
        localStorage.removeItem('pharmatrace_user');
        return null;
    }
}

function getCachedUser() {
    if (currentUser) return currentUser;
    const raw = localStorage.getItem('pharmatrace_user');
    if (raw) {
        try {
            currentUser = JSON.parse(raw);
            return currentUser;
        } catch {
            return null;
        }
    }
    return null;
}

async function logout() {
    try {
        await api('/api/auth/logout', { method: 'POST' });
    } catch {
        // Continue
    }
    currentUser = null;
    localStorage.removeItem('pharmatrace_user');
    localStorage.removeItem('pharmatrace_token');
    window.location.href = 'login.html';
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
}

async function renderNavbar(activePage = '') {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    const user = await fetchCurrentUser();

    // Role-specific brand and role-isolated navigation links (no confusing cross-role links)
    let brandHtml = '<a class="nav-brand" href="customer.html">💊 PharmaTrace</a>';
    let navLinksHtml = '';

    if (activePage === 'manufacturer' || (user && user.role === 'manufacturer' && activePage !== 'customer')) {
        brandHtml = `
            <a class="nav-brand" href="manufacturer.html">
                <span>💊 PharmaTrace</span>
                <span class="user-badge role-manufacturer" style="font-size:0.7rem;margin-left:6px;">Manufacturer Portal</span>
            </a>
        `;
        navLinksHtml = `
            <li><a class="active" href="manufacturer.html">🏭 My Production</a></li>
            <li><a href="#" onclick="if(window.showMfgSection){window.showMfgSection('products');}return false;">📦 My Products</a></li>
            <li><a href="#" onclick="if(window.showMfgSection){window.showMfgSection('register');}return false;">➕ Register Batch</a></li>
            <li><a href="#" onclick="if(window.showMfgSection){window.showMfgSection('qrManager');}return false;">📱 QR Labels</a></li>
        `;
    } else if (activePage === 'retailer' || (user && user.role === 'retailer' && activePage !== 'customer')) {
        brandHtml = `
            <a class="nav-brand" href="retailer.html">
                <span>💊 PharmaTrace</span>
                <span class="user-badge role-retailer" style="font-size:0.7rem;margin-left:6px;">Pharmacy & Retailer</span>
            </a>
        `;
        navLinksHtml = `
            <li><a class="active" href="retailer.html">🏪 Stock Management</a></li>
            <li><a href="#" onclick="if(window.openScannerModal){window.openScannerModal();}return false;">📷 Scan QR</a></li>
            <li><a href="customer.html">🔍 Public Verify</a></li>
        `;
    } else if (activePage === 'customer') {
        brandHtml = `
            <a class="nav-brand" href="customer.html">
                <span>💊 PharmaTrace</span>
                <span style="font-size:0.72rem;font-weight:600;color:#94a3b8;margin-left:4px;">Authenticity Registry</span>
            </a>
        `;
        navLinksHtml = `
            <li><a class="active" href="customer.html">🔍 Verify Medicine</a></li>
            <li><a href="#howItProtectsSection">🛡️ How It Protects You</a></li>
        `;
    } else if (activePage === 'admin' || (user && user.role === 'admin')) {
        brandHtml = `
            <a class="nav-brand" href="admin.html">
                <span>💊 PharmaTrace</span>
                <span class="user-badge role-admin" style="font-size:0.7rem;margin-left:6px;">Admin Console</span>
            </a>
        `;
        navLinksHtml = `
            <li><a class="active" href="admin.html">Admin Dashboard</a></li>
            <li><a href="ledger.html">Public Ledger</a></li>
        `;
    } else {
        brandHtml = `<a class="nav-brand" href="customer.html">💊 PharmaTrace</a>`;
        navLinksHtml = `
            <li><a href="customer.html">🔍 Verify Medicine</a></li>
            <li><a href="ledger.html">Public Ledger</a></li>
        `;
    }

    let authSection = '';
    if (user) {
        const roleClass = `role-${user.role}`;
        authSection = `
            <div class="user-profile-menu">
                <button id="notifBellBtn" class="notif-btn" title="Notifications">
                    🔔 <span id="notifCount" class="notif-badge" style="display:none">0</span>
                </button>
                <div id="notifDropdown" class="notif-dropdown">
                    <div style="padding:10px 14px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
                        <b>Notifications</b>
                        <button class="btn-sm btn-secondary" onclick="markAllNotificationsRead()">Mark all read</button>
                    </div>
                    <div id="notifList">Loading...</div>
                </div>
            </div>
            <div class="user-profile-menu">
                <button id="userMenuBtn" class="user-avatar-btn">
                    <span>👤 ${user.name.split(' ')[0]}</span>
                    <span class="user-badge ${roleClass}">${user.role}</span>
                    <span>▾</span>
                </button>
                <div id="userDropdownMenu" class="user-dropdown">
                    <div class="user-dropdown-header">
                        <b>${user.name}</b>
                        <span>${user.email}</span>
                        ${user.organization ? `<div style="font-size:0.75rem;color:#0284c7;margin-top:2px;">${user.organization}</div>` : ''}
                    </div>
                    <button class="user-dropdown-item" onclick="openProfileModal()">👤 Account Profile</button>
                    <button class="user-dropdown-item" onclick="openChangePasswordModal()">🔑 Change Password</button>
                    <div style="border-top:1px solid #f1f5f9;"></div>
                    <button class="user-dropdown-item" style="color:#ef4444;" onclick="logout()">🚪 Logout</button>
                </div>
            </div>
        `;
    } else {
        authSection = `
            <a href="login.html" class="btn btn-sm btn-secondary">🔐 Staff Sign In →</a>
        `;
    }

    nav.innerHTML = `
        <div class="nav-container">
            ${brandHtml}
            <ul class="nav-links">
                ${navLinksHtml}
            </ul>
            <div class="nav-auth">
                ${authSection}
            </div>
        </div>
    `;

    // Dropdown listeners
    const menuBtn = document.getElementById('userMenuBtn');
    const menu = document.getElementById('userDropdownMenu');
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
            const notif = document.getElementById('notifDropdown');
            if (notif) notif.classList.remove('show');
        });
    }

    const notifBtn = document.getElementById('notifBellBtn');
    const notifDrop = document.getElementById('notifDropdown');
    if (notifBtn && notifDrop) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDrop.classList.toggle('show');
            if (menu) menu.classList.remove('show');
            loadNotifications();
        });
    }

    document.addEventListener('click', () => {
        if (menu) menu.classList.remove('show');
        if (notifDrop) notifDrop.classList.remove('show');
    });

    if (user) {
        pollNotifications();
    }
}

async function loadNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;
    try {
        const data = await api('/api/notifications');
        const badge = document.getElementById('notifCount');
        if (badge) {
            badge.textContent = data.unreadCount || 0;
            badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
        }
        if (!data.notifications || data.notifications.length === 0) {
            list.innerHTML = '<div style="padding:16px;text-align:center;color:#64748b;font-size:0.85rem;">No notifications yet.</div>';
            return;
        }
        list.innerHTML = data.notifications.map(n => `
            <div class="notif-item ${n.isRead ? '' : 'unread'}" onclick="handleNotifClick('${n._id}', '${n.link || ''}')">
                <div class="notif-title">${n.title}</div>
                <div style="color:#475569;font-size:0.8rem;">${n.message}</div>
                <div class="notif-time">${new Date(n.createdAt).toLocaleTimeString()}</div>
            </div>
        `).join('');
    } catch {
        list.innerHTML = '<div style="padding:12px;color:#ef4444;font-size:0.8rem;">Could not load alerts.</div>';
    }
}

async function handleNotifClick(id, link) {
    try {
        await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {}
    if (link) window.location.href = link;
    else loadNotifications();
}

async function markAllNotificationsRead() {
    try {
        await api('/api/notifications/mark-all-read', { method: 'POST' });
        loadNotifications();
    } catch {}
}

async function pollNotifications() {
    try {
        const data = await api('/api/notifications');
        const badge = document.getElementById('notifCount');
        if (badge) {
            badge.textContent = data.unreadCount || 0;
            badge.style.display = data.unreadCount > 0 ? 'inline-block' : 'none';
        }
    } catch {}
}

async function requireAuth(allowedRoles = []) {
    const user = await fetchCurrentUser();
    if (!user) {
        window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        return null;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        alert(`Access Restricted: This dashboard requires ${allowedRoles.join(' or ')} privileges. Redirecting to your portal...`);
        if (user.role === 'admin') window.location.href = 'admin.html';
        else if (user.role === 'manufacturer') window.location.href = 'manufacturer.html';
        else if (user.role === 'retailer') window.location.href = 'retailer.html';
        else window.location.href = 'customer.html';
        return null;
    }
    return user;
}

function injectGlobalModals() {
    if (document.getElementById('profileModal')) return;
    const div = document.createElement('div');
    div.innerHTML = `
        <!-- Profile Modal -->
        <div id="profileModal" class="modal-backdrop">
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Account Profile</h3>
                    <button class="modal-close" onclick="closeModal('profileModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="profileMsg" class="alert"></div>
                    <form id="profileForm">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input id="profileName" type="text" required>
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input id="profileEmail" type="email" disabled style="background:#f1f5f9;">
                        </div>
                        <div class="form-group">
                            <label>Organization / Company / Pharmacy</label>
                            <input id="profileOrg" type="text">
                        </div>
                        <div class="form-group">
                            <label>Contact Phone</label>
                            <input id="profilePhone" type="text">
                        </div>
                        <div class="form-group">
                            <label>Regulatory License Number</label>
                            <input id="profileLicense" type="text">
                        </div>
                        <button type="submit" class="btn btn-block">Save Profile Changes</button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Change Password Modal -->
        <div id="changePasswordModal" class="modal-backdrop">
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Change Password</h3>
                    <button class="modal-close" onclick="closeModal('changePasswordModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="changePassMsg" class="alert"></div>
                    <form id="changePasswordForm">
                        <div class="form-group">
                            <label>Current Password</label>
                            <input id="currentPass" type="password" required>
                        </div>
                        <div class="form-group">
                            <label>New Password (min 6 characters)</label>
                            <input id="newPass" type="password" minlength="6" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm New Password</label>
                            <input id="confirmPass" type="password" minlength="6" required>
                        </div>
                        <button type="submit" class="btn btn-block">Update Password</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('profileMsg');
        try {
            await api('/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    name: document.getElementById('profileName').value,
                    organization: document.getElementById('profileOrg').value,
                    phone: document.getElementById('profilePhone').value,
                    licenseNumber: document.getElementById('profileLicense').value
                })
            });
            showMessage(msg, 'Profile updated successfully!', 'success');
            await fetchCurrentUser();
            renderNavbar();
            setTimeout(() => closeModal('profileModal'), 1200);
        } catch (err) {
            showMessage(msg, err.message, 'error');
        }
    });

    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('changePassMsg');
        const p1 = document.getElementById('newPass').value;
        const p2 = document.getElementById('confirmPass').value;
        if (p1 !== p2) {
            showMessage(msg, 'New passwords do not match.', 'error');
            return;
        }
        try {
            await api('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: document.getElementById('currentPass').value,
                    newPassword: p1
                })
            });
            showMessage(msg, 'Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
            setTimeout(() => closeModal('changePasswordModal'), 1200);
        } catch (err) {
            showMessage(msg, err.message, 'error');
        }
    });
}

function openProfileModal() {
    const user = getCachedUser();
    if (!user) return;
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profileOrg').value = user.organization || '';
    document.getElementById('profilePhone').value = user.phone || '';
    document.getElementById('profileLicense').value = user.licenseNumber || '';
    openModal('profileModal');
}

function openChangePasswordModal() {
    document.getElementById('changePasswordForm').reset();
    openModal('changePasswordModal');
}

document.addEventListener('DOMContentLoaded', () => {
    injectGlobalModals();
});
