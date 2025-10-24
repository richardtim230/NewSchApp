
    const API_BASE = "https://examguide.onrender.com";
    let withdrawableBalance = 0;

    function formatNaira(amount) {
      if (typeof amount !== "number" || isNaN(amount) || amount < 0) return "₦0.00";
      return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function sanitizeText(str) {
      const div = document.createElement('div');
      div.appendChild(document.createTextNode(str));
      return div.innerHTML;
    }

    async function loadEarnings() {
      const token = localStorage.getItem('token');
      if (!token || typeof token !== "string" || token.length < 10) {
        window.location.href = "mock.html";
        return;
      }
      try {
        const [ures, bres] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, {
            headers: { "Authorization": "Bearer " + token }
          }),
          fetch(`${API_BASE}/api/rewards/breakdown`, {
            headers: { "Authorization": "Bearer " + token }
          })
        ]);
        if (!ures.ok || !bres.ok) throw new Error("Session expired");
        const udata = await ures.json();
        const bdata = await bres.json();

        const user = udata.user || {};
        const points = typeof user.points === "number" && user.points > 0 ? user.points : 0;
        document.getElementById('greeting').textContent =
          `Hi, ${sanitizeText(user.fullname || user.username || "User")}! 👋`;
        document.getElementById('user-level').textContent =
          user.level ? `Level ${sanitizeText(user.level)}` : "";
        document.getElementById('user-points').textContent = `${points} points`;
        document.getElementById('total-points').textContent = points;

        // New conversion: 1 point = ₦1
        const totalNaira = points;
        document.getElementById('total-naira').textContent = formatNaira(totalNaira);
        withdrawableBalance = Math.floor(points);
        document.getElementById('withdraw-btn').disabled = (withdrawableBalance < 500);
        document.getElementById('withdraw-btn').classList.toggle('opacity-50', withdrawableBalance < 500);

        // Breakdown (each is in points, convert to naira at 1:1)
        const practiced = typeof bdata.practiced === "number" && bdata.practiced > 0 ? bdata.practiced : 0;
        const reading = typeof bdata.reading === "number" && bdata.reading > 0 ? bdata.reading : 0;
        const bonus = typeof bdata.bonus === "number" && bdata.bonus > 0 ? bdata.bonus : 0;
        const admin = typeof bdata.admin === "number" && bdata.admin > 0 ? bdata.admin : 0;

        document.getElementById('breakdown-practiced').textContent = formatNaira(practiced);
        document.getElementById('breakdown-reading').textContent  = formatNaira(reading);
        document.getElementById('breakdown-bonus').textContent    = formatNaira(bonus);
        document.getElementById('breakdown-admin').textContent    = formatNaira(admin);
      } catch (e) {
        alert("Session expired or invalid. Please log in again.");
        localStorage.removeItem('token');
        window.location.href = "mock.html";
      }
    }

    // Modal helpers
    function showModal(id) {
      document.getElementById(id).classList.remove('hidden');
    }
    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
      document.getElementById("withdraw-form").style.display = "";
      document.getElementById("withdraw-success").classList.add("hidden");
      document.getElementById("withdraw-alert").classList.add("hidden");
      document.getElementById("withdraw-form").reset();
    }

    document.addEventListener("DOMContentLoaded", () => {
      loadEarnings();

      document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = "mock.html";
      });

      // Withdraw modal open
      document.getElementById('withdraw-btn').addEventListener('click', () => {
        if (withdrawableBalance < 500) return;
        showModal('withdraw-modal');
        document.getElementById('withdraw-amount').setAttribute('max', withdrawableBalance);
        document.getElementById('withdraw-amount').value = withdrawableBalance >= 500 ? 500 : '';
      });

      // Modal close
      document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => closeModal('withdraw-modal');
      });

      // Withdraw form submission
      document.getElementById('withdraw-form').onsubmit = async function(e) {
        e.preventDefault();
        const amount = Number(document.getElementById('withdraw-amount').value);
        const bank = document.getElementById('withdraw-bank').value.trim();
        const accountName = document.getElementById('withdraw-account-name').value.trim();
        const accountNumber = document.getElementById('withdraw-account-number').value.trim();
        const alertBox = document.getElementById('withdraw-alert');
        alertBox.classList.add('hidden');

        if (
          isNaN(amount) || amount < 500 || amount % 500 !== 0 ||
          amount > withdrawableBalance ||
          !bank || !accountName || !/^\d{10,12}$/.test(accountNumber)
        ) {
          alertBox.textContent = "Please enter valid details and amount (min ₦500, multiples of ₦500, ≤ available balance).";
          alertBox.className = "block text-red-700 bg-red-100";
          alertBox.classList.remove('hidden');
          return;
        }

        this.querySelector('button[type=submit]').disabled = true;

        try {
          const r = await fetch(`${API_BASE}/api/withdrawals`, {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + (localStorage.getItem("token") || ""),
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount, bank, accountName, accountNumber })
          });
          const data = await r.json();
          if (r.ok && data.success) {
            this.style.display = "none";
            document.getElementById('withdraw-success').classList.remove('hidden');
            loadEarnings();
          } else {
            alertBox.textContent = (data.error || "Failed to submit withdrawal.");
            alertBox.className = "block text-red-700 bg-red-100";
            alertBox.classList.remove('hidden');
            this.querySelector('button[type=submit]').disabled = false;
          }
        } catch (err) {
          alertBox.textContent = "Network error. Please try again.";
          alertBox.className = "block text-red-700 bg-red-100";
          alertBox.classList.remove('hidden');
          this.querySelector('button[type=submit]').disabled = false;
        }
      };
    });
