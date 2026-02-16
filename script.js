// Floating particles
(function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        const wrapper = canvas.parentElement;
        canvas.width = wrapper.offsetWidth;
        canvas.height = wrapper.offsetHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -Math.random() * 0.4 - 0.1,
            opacity: Math.random() * 0.5 + 0.1,
        };
    }

    function init() {
        resize();
        particles = [];
        const count = Math.floor((canvas.width * canvas.height) / 12000);
        for (let i = 0; i < count; i++) {
            particles.push(createParticle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.y < -10) p.y = canvas.height + 10;
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    init();
    animate();
})();

// ==========================================
// Signup storage (localStorage)
// ==========================================
const SignupStore = {
    KEY: 'sorta_waitlist_signups',

    getAll() {
        const data = localStorage.getItem(this.KEY);
        return data ? JSON.parse(data) : [];
    },

    add(email) {
        const signups = this.getAll();
        // Don't add duplicates
        if (signups.some((s) => s.email === email)) return false;
        signups.unshift({ email, date: new Date().toISOString() });
        localStorage.setItem(this.KEY, JSON.stringify(signups));
        return true;
    },

    clear() {
        localStorage.removeItem(this.KEY);
    },

    getCount() {
        return this.getAll().length;
    },

    getTodayCount() {
        const today = new Date().toDateString();
        return this.getAll().filter(
            (s) => new Date(s.date).toDateString() === today
        ).length;
    },

    toCsv() {
        const signups = this.getAll();
        if (signups.length === 0) return '';
        const header = 'Email,Signup Date\n';
        const rows = signups
            .map((s) => `${s.email},${new Date(s.date).toLocaleString()}`)
            .join('\n');
        return header + rows;
    },
};

// ==========================================
// Waitlist form handling
// ==========================================
(function initForm() {
    const form = document.getElementById('waitlistForm');
    const input = document.getElementById('emailInput');
    const overlay = document.getElementById('successOverlay');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = input.value.trim();
        if (!email) return;

        const btn = document.getElementById('joinBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Joining...';
        btn.disabled = true;

        // Save locally
        SignupStore.add(email);

        // Send to serverless proxy (Formspree ID stays in env vars, never in client code)
        try {
            await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
        } catch (err) {
            console.warn('Submission failed:', err);
        }

        // Show success
        btn.textContent = originalText;
        btn.disabled = false;
        overlay.classList.add('active');

        setTimeout(() => {
            overlay.classList.remove('active');
            input.value = '';
        }, 3000);
    });
})();

// ==========================================
// Admin Panel (Ctrl+Shift+A to open)
// ==========================================
(function initAdmin() {
    const adminOverlay = document.getElementById('adminOverlay');
    const adminClose = document.getElementById('adminClose');
    const signupList = document.getElementById('signupList');
    const totalEl = document.getElementById('totalSignups');
    const todayEl = document.getElementById('todaySignups');
    const exportBtn = document.getElementById('exportCsv');
    const clearBtn = document.getElementById('clearSignups');

    function renderSignups() {
        const signups = SignupStore.getAll();
        totalEl.textContent = signups.length;
        todayEl.textContent = SignupStore.getTodayCount();

        if (signups.length === 0) {
            signupList.innerHTML = '<p class="empty-state">No signups yet</p>';
            return;
        }

        signupList.innerHTML = signups
            .map(
                (s) => `
            <div class="signup-entry">
                <span class="signup-email">${s.email}</span>
                <span class="signup-date">${new Date(s.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}</span>
            </div>
        `
            )
            .join('');
    }

    function openAdmin() {
        renderSignups();
        adminOverlay.classList.add('active');
    }

    function closeAdmin() {
        adminOverlay.classList.remove('active');
    }

    // Keyboard shortcut: Ctrl+Shift+A (or Cmd+Shift+A on Mac)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            if (adminOverlay.classList.contains('active')) {
                closeAdmin();
            } else {
                openAdmin();
            }
        }
    });

    adminClose.addEventListener('click', closeAdmin);

    adminOverlay.addEventListener('click', (e) => {
        if (e.target === adminOverlay) closeAdmin();
    });

    // Export CSV
    exportBtn.addEventListener('click', () => {
        const csv = SignupStore.toCsv();
        if (!csv) return;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sorta-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Clear all
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all signups?')) {
            SignupStore.clear();
            renderSignups();
        }
    });
})();
