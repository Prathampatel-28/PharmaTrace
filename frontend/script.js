const API_BASE = '';

async function api(path, options = {}) {
    const response = await fetch(API_BASE + path, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Request failed. Please try again.');
    }

    return data;
}

function showMessage(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = 'alert ' + (type === 'success' ? 'alert-success' : 'alert-error');
    element.style.display = 'block';
}

async function updateDashboardStats() {
    const totalElem = document.getElementById('totalBatchesCount');
    const checkpointsElem = document.getElementById('totalCheckpointsCount');

    try {
        const batches = await api('/api/medicines');

        if (totalElem) {
            totalElem.textContent = batches.length;
        }

        if (checkpointsElem) {
            const totalUpdates = batches.reduce((sum, batch) => {
                return sum + (batch.checkpoints ? batch.checkpoints.length : 0);
            }, 0);
            checkpointsElem.textContent = totalUpdates;
        }
    } catch (error) {
        if (totalElem) totalElem.textContent = '—';
        if (checkpointsElem) checkpointsElem.textContent = '—';
    }
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'Manufactured':
            return 'status-badge status-factory';
        case 'Received':
            return 'status-badge status-distributor';
        case 'In Stock':
        case 'Sold':
            return 'status-badge status-pharmacy';
        case 'Recalled':
            return 'status-badge status-recalled';
        default:
            return 'status-badge status-pharmacy';
    }
}
