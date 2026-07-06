// app.js
window.onerror = function(msg, url, lineNo, columnNo, error) {
  alert('TERTANGKAP ERROR!\nPesan: ' + msg + '\nBaris: ' + lineNo + '\nKolom: ' + columnNo);
  return false;
};
window.onunhandledrejection = function(event) {
  alert('TERTANGKAP PROMISE ERROR!\nPesan: ' + (event.reason ? event.reason.message || event.reason : 'Unknown Error'));
};

const app = {
  // === CONFIGURATION DATABASE ===
  // Ganti URL di bawah ini dengan URL Web App Google Sheets Anda agar otomatis terhubung untuk semua orang!
  DEFAULT_API_URL: 'https://script.google.com/macros/s/AKfycbw_q9LmgXLj5xfOJcXgYr0sENih__Tuto75Si0FxMZ7QvCIly5PEm73hfSYrxnmX1Pw/exec',

  data: {
    menus: [],
    invoices: [],
    users: [],
    schedules: [],
    currentUser: null,
    apiUrl: localStorage.getItem('apiUrl') || '', // Akan diinisialisasi di init() jika kosong
    language: localStorage.getItem('appLanguage') || 'id'
  },

  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>"']/g, function(m) {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return m;
      }
    });
  },

  translations: {
    id: {
      dashboard: "Dashboard",
      invoices: "Invoices",
      schedules: "Schedules",
      masterMenu: "Master Menu",
      masterUser: "Master User",
      reports: "Reports",
      incomeReports: "Laporan Pendapatan",
      revenueAnalysis: "Analisis realisasi & sisa piutang katering",
      settings: "Settings",
      management: "Management",
      languageLabel: "Bahasa:",
      welcomeBack: "Selamat datang di Poetry's Catering",
      refresh: "Segarkan",
      newInvoice: "Faktur Baru",
      recentInvoices: "Invoice Terbaru",
      invoiceNo: "Invoice #",
      customer: "Pelanggan",
      cateringDate: "Tanggal Katering",
      amount: "Total Tagihan",
      revenueOverview: "Ikhtisar Pendapatan (Tahun Ini)",
      upcomingDueInvoices: "Jadwal Jatuh Tempo Terdekat (5 Belum Lunas)",
      remainingAmount: "Sisa Tagihan",
      status: "Status",
      manageInvoices: "Kelola semua faktur katering",
      location: "Lokasi",
      phone: "Telepon",
      actions: "Aksi",
      generateInvoiceSub: "Buat faktur dan jadwal katering baru",
      back: "Kembali",
      schedulesSub: "Tanggal katering berdasarkan invoice yang dibuat",
      schedulesTitle: "Jadwal Katering",
      clear: "Bersihkan",
      daySun: "Min",
      dayMon: "Sen",
      dayTue: "Sel",
      dayWed: "Rab",
      dayThu: "Kam",
      dayFri: "Jum",
      daySat: "Sab",
       importExcel: "Impor Excel",
       logoutLabel: "Keluar",
       nearestSchedules: "Jadwal Katering Terdekat",
       cateringTime: "Waktu Pengiriman"
     },
     en: {
       dashboard: "Dashboard",
       invoices: "Invoices",
       schedules: "Schedules",
       masterMenu: "Master Menu",
       masterUser: "Master User",
       reports: "Reports",
       settings: "Settings",
       management: "Management",
       languageLabel: "Language:",
       welcomeBack: "Welcome back to Poetry's Catering",
       refresh: "Refresh",
       newInvoice: "New Invoice",
       logoutLabel: "Logout",
       recentInvoices: "Recent Invoices",
       invoiceNo: "Invoice #",
       customer: "Customer",
       cateringDate: "Catering Date",
       amount: "Total Amount",
       revenueOverview: "Revenue Overview (This Year)",
       upcomingDueInvoices: "Upcoming Due Invoices (Closest 5 Unpaid)",
       nearestSchedules: "Nearest Catering Schedules",
       remainingAmount: "Remaining Amount",
       status: "Status",
       manageInvoices: "Manage all catering invoices",
       location: "Location",
       phone: "Phone",
       actions: "Actions",
       generateInvoiceSub: "Generate a new catering invoice and schedule",
       back: "Back",
       schedulesSub: "Catering dates based on created invoices",
       schedulesTitle: "Catering Schedule",
       clear: "Clear",
       daySun: "Sun",
       dayMon: "Mon",
       dayTue: "Tue",
       dayWed: "Wed",
       dayThu: "Thu",
       dayFri: "Fri",
       daySat: "Sat",
       importExcel: "Import Excel",
       cateringTime: "Delivery Time"
     }
   },
  
  // Invoice Builder State
  currentInvoice: {
    items: [],
    total: 0
  },

  // Schedules Pagination, Search & Sorting States
  scheduleState: {
    currentPage: 1,
    perPage: 10,
    searchName: '',
    selectedDate: '', // Format YYYY-MM-DD
    currentMonth: new Date().getMonth(), // 0-indexed
    currentYear: new Date().getFullYear(),
    sortAsc: true
  },

  // Dashboard Mini Calendar State (independent from scheduleState)
  dashCalState: {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
  },

  // Invoices Pagination, Search & Sorting States
  invoiceState: {
    currentPage: 1,
    perPage: 10,
    searchQuery: '',
    filterStatus: 'all',     // 'all' | 'Lunas' | 'DP / Sebagian' | 'Belum Lunas'
    filterDateFrom: '',      // YYYY-MM-DD
    filterDateTo: ''         // YYYY-MM-DD
  },

  // Menus Pagination, Search States
  menuState: {
    currentPage: 1,
    perPage: 10,
    searchQuery: ''
  },

  editInvoiceState: {
    items: [],
    invoiceNumber: ''
  },

  menuModalState: {
    target: 'create', // 'create' or 'edit'
    searchQuery: '',
    currentPage: 1,
    perPage: 10,
    selectedItems: {} // Map of menuId -> { qty, checked }
  },

  reportState: {
    filterType: 'year', // 'year' or 'range'
    selectedYear: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    showChart: false
  },

  chartInstance: null,
  reportChartInstance: null,

  init() {
    // Gunakan URL default jika belum ada URL yang disimpan di browser ini
    if (!this.data.apiUrl && this.DEFAULT_API_URL && !this.DEFAULT_API_URL.includes('...')) {
      this.data.apiUrl = this.DEFAULT_API_URL;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const invoiceNum = urlParams.get('invoice') || urlParams.get('inv');
    if (invoiceNum) {
      this.initTheme();
      this.bindEvents();
      this.loadGuestInvoice(invoiceNum);
      return;
    }

    this.initTheme();
    this.applyLogo();
    
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    
    // Set active language
    const savedLang = localStorage.getItem('appLanguage') || 'id';
    this.setLanguage(savedLang);

    lucide.createIcons();
    this.checkAuth();
    this.initSessionTimeout();
    this.bindEvents();

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const firstDayStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const lastDayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    this.invoiceState.filterDateFrom = firstDayStr;
    this.invoiceState.filterDateTo = lastDayStr;
    
    if (this.data.currentUser) {
      // Immediate load from cache for blazing fast UI
      this.data.menus = JSON.parse(localStorage.getItem('menus') || '[]');
      this.data.invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
      this.data.users = JSON.parse(localStorage.getItem('users') || '[]');
      this.data.schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
      
      this.navigate('dashboard');
      this.updateNotifications();
      
      // Silently fetch fresh data in background
      this.loadData(true);
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      this.updateThemeButtonIcon('light');
    } else {
      document.body.classList.remove('light-theme');
      this.updateThemeButtonIcon('dark');
    }
  },

  toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    const newTheme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    this.updateThemeButtonIcon(newTheme);

    // Re-render charts immediately so their colors update matching the theme
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) {
      const page = activeLink.getAttribute('data-page');
      if (page === 'dashboard') {
        this.renderDashboard();
      } else if (page === 'reports') {
        this.renderReports();
      }
    }
  },

  updateThemeButtonIcon(theme) {
    const btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    if (theme === 'light') {
      btn.innerHTML = '<i data-lucide="moon"></i>';
    } else {
      btn.innerHTML = '<i data-lucide="sun"></i>';
    }
    lucide.createIcons();
  },

  // Toggle show/hide password
  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';

    // Find the toggle button inside the same wrapper
    const wrapper = input.closest('.password-input-wrapper');
    const btn = wrapper ? wrapper.querySelector('.password-toggle-btn') : null;
    if (btn) {
      const newIcon = isHidden ? 'eye-off' : 'eye';
      btn.innerHTML = `<i data-lucide="${newIcon}" style="width:16px; height:16px;"></i>`;
      lucide.createIcons({ nodes: [btn] });
    }

    input.focus();
  },

  applyLogo() {
    let logoData = localStorage.getItem('businessLogo');
    if (!logoData) {
      if (typeof DEFAULT_LOGO !== 'undefined') {
        logoData = DEFAULT_LOGO;
      } else {
        logoData = './logo.png';
      }
    }
    
    if (logoData && logoData.startsWith('http')) {
      logoData = this.convertDriveUrl(logoData);
    }
    
    const loginContainer = document.getElementById('loginLogoContainer');
    const sidebarContainer = document.getElementById('sidebarLogoContainer');
    const navbarContainer = document.getElementById('navbarLogoContainer');
    const pdfContainer = document.getElementById('pdfLogoContainer');
    const settingsPreview = document.getElementById('settingsLogoPreview');
    
    if (logoData) {
      if (loginContainer) {
        loginContainer.innerHTML = `<img src="${logoData}" style="max-height: 220px; max-width: 440px; object-fit: contain;">`;
        loginContainer.style.display = 'flex';
      }
      if (sidebarContainer) {
        sidebarContainer.innerHTML = `<img src="${logoData}" style="max-height: 110px; max-width: 220px; object-fit: contain; margin-bottom: 5px;">`;
        sidebarContainer.style.display = 'block';
      }
      if (navbarContainer) {
        navbarContainer.innerHTML = `<img src="${logoData}" style="max-height: 48px; max-width: 140px; object-fit: contain; border-radius: 4px; display: block;">`;
        navbarContainer.style.display = 'flex';
        navbarContainer.style.alignItems = 'center';
      }
      if (pdfContainer) {
        // For PDF, always use base64 to avoid canvas CORS taint
        if (logoData.startsWith('data:') || logoData.startsWith('./') || logoData.startsWith('/')) {
          // Already base64 or local — safe to use directly
          pdfContainer.innerHTML = `<img src="${logoData}" style="max-height: 80px; max-width: 220px; object-fit: contain;">`;
          pdfContainer.style.display = 'block';
        } else {
          // Remote URL — fetch and convert to base64
          fetch(logoData)
            .then(r => r.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                pdfContainer.innerHTML = `<img src="${reader.result}" style="max-height: 80px; max-width: 220px; object-fit: contain;">`;
                pdfContainer.style.display = 'block';
              };
              reader.readAsDataURL(blob);
            })
            .catch(() => {
              // Fallback: use directly (may cause canvas taint but better than nothing)
              pdfContainer.innerHTML = `<img src="${logoData}" crossorigin="anonymous" style="max-height: 80px; max-width: 220px; object-fit: contain;">`;
              pdfContainer.style.display = 'block';
            });
        }
      }
      if (settingsPreview) {
        settingsPreview.innerHTML = `<img src="${logoData}" style="width: 100%; height: 100%; object-fit: contain;">`;
      }
    } else {
      if (loginContainer) {
        loginContainer.innerHTML = '';
        loginContainer.style.display = 'none';
      }
      if (sidebarContainer) {
        sidebarContainer.innerHTML = '';
        sidebarContainer.style.display = 'none';
      }
      if (navbarContainer) {
        navbarContainer.innerHTML = '';
        navbarContainer.style.display = 'none';
      }
      if (pdfContainer) {
        pdfContainer.innerHTML = '';
        pdfContainer.style.display = 'none';
      }
      if (settingsPreview) {
        settingsPreview.innerHTML = `<span class="text-muted" style="font-size:12px; text-align:center; padding:4px;">No Logo</span>`;
      }
    }
  },

  convertDriveUrl(url) {
    if (!url) return '';
    let fileId = '';
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    
    if (fileIdMatch && fileIdMatch[1]) {
      fileId = fileIdMatch[1];
    } else if (idParamMatch && idParamMatch[1]) {
      fileId = idParamMatch[1];
    }
    
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
    return url;
  },

  saveLogoUrl() {
    const urlInput = document.getElementById('settingLogoUrl');
    if (!urlInput) return;
    const url = urlInput.value.trim();
    if (!url) {
      this.showAlert("Harap masukkan URL logo yang valid.", "warning");
      return;
    }
    localStorage.setItem('businessLogo', url);
    this.applyLogo();
    this.showAlert("URL Logo berhasil disimpan!", "success");
  },

  saveLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1024 * 1024) {
      this.showAlert("Ukuran gambar terlalu besar! Harap unggah gambar di bawah 1MB.", "warning");
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const base64 = evt.target.result;
        localStorage.setItem('businessLogo', base64);
        this.applyLogo();
        this.showAlert("Logo berhasil disimpan!", "success");
      } catch (err) {
        console.error(err);
        this.showAlert("Gagal memproses gambar logo.", "error");
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  },

  async removeLogo() {
    if (await this.showConfirm("Apakah Anda yakin ingin menghapus logo bisnis?", "Hapus Logo")) {
      localStorage.removeItem('businessLogo');
      this.applyLogo();
      this.showAlert("Logo berhasil dihapus.", "success");
    }
  },

  loadingInterval: null,
  loadingProgress: 0,

  showLoading(show, text = 'Memuat...') {
    const el = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    const progressText = document.getElementById('loadingProgressText');
    const progressBar = document.getElementById('loadingProgressBarInner');
    
    if (!el || !textEl) return;

    if (show) {
      textEl.textContent = text;
      el.classList.remove('hidden');
      
      this.loadingProgress = 0;
      if (progressText) progressText.textContent = '0%';
      if (progressBar) {
        progressBar.style.transition = 'none'; // reset smoothly
        progressBar.style.width = '0%';
        void progressBar.offsetWidth; // force browser reflow
        progressBar.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      
      if (this.loadingInterval) clearInterval(this.loadingInterval);
      
      // Simulate realistic loading progress
      this.loadingInterval = setInterval(() => {
        const remaining = 95 - this.loadingProgress;
        const step = Math.max(0.5, remaining * 0.15 * Math.random());
        this.loadingProgress += step;
        if (this.loadingProgress >= 95) this.loadingProgress = 95;
        
        if (progressText) progressText.textContent = Math.floor(this.loadingProgress) + '%';
        if (progressBar) progressBar.style.width = this.loadingProgress + '%';
      }, 150);
      
    } else {
      if (this.loadingInterval) clearInterval(this.loadingInterval);
      if (el.classList.contains('hidden')) return;
      
      // Snap to 100%
      if (progressText) progressText.textContent = '100%';
      if (progressBar) progressBar.style.width = '100%';
      
      // Give the user 350ms to read "100%" visually before fading out
      setTimeout(() => {
        el.classList.add('hidden');
      }, 350);
    }
  },

  async refreshData() {
    this.showLoading(true);
    try {
      await this.loadData();
      // Find currently active page
      const activeLink = document.querySelector('.nav-link.active');
      if (activeLink) {
        const page = activeLink.getAttribute('data-page');
        this.navigate(page);
      }
      this.showAlert("Data berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      this.showAlert("Gagal memuat ulang data. Coba periksa koneksi internet Anda.", "error");
    } finally {
      this.showLoading(false);
    }
  },

  // === Authentication ===
  checkAuth() {
    const userJson = localStorage.getItem('currentUser');
    const token = localStorage.getItem('sessionToken');
    if (userJson && token) {
      this.data.currentUser = JSON.parse(userJson);
      document.getElementById('pageLogin').classList.add('hidden');
      document.getElementById('appLayout').classList.remove('hidden');
      this.applyRoles();
      if (!localStorage.getItem('lastActivityTime')) {
        localStorage.setItem('lastActivityTime', Date.now().toString());
      }
    } else {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('lastActivityTime');
      this.data.currentUser = null;
      document.getElementById('pageLogin').classList.remove('hidden');
      document.getElementById('appLayout').classList.add('hidden');
    }
  },

  initSessionTimeout() {
    const activityEvents = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, () => {
        if (localStorage.getItem('sessionToken')) {
          localStorage.setItem('lastActivityTime', Date.now().toString());
        }
      }, { passive: true });
    });

    // Check every 10 seconds
    setInterval(() => {
      const token = localStorage.getItem('sessionToken');
      if (!token) return;

      const lastActivity = Number(localStorage.getItem('lastActivityTime')) || Date.now();
      const diff = Date.now() - lastActivity;
      const timeoutLimit = 15 * 60 * 1000; // 15 minutes in ms

      if (diff >= timeoutLimit) {
        this.logout(true);
      }
    }, 10000);
  },

  applyRoles() {
    const role = this.data.currentUser.role;
    const displayName = this.data.currentUser.name || this.data.currentUser.username;
    document.getElementById('displayUsername').textContent = displayName;
    document.getElementById('displayRole').textContent = role;

    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      if (role === 'admin' || role === 'super admin') el.classList.remove('hidden');
      else el.classList.add('hidden');
    });

    const superAdminElements = document.querySelectorAll('.super-admin-only');
    superAdminElements.forEach(el => {
      if (role === 'super admin') el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
  },

  async logout(force = false) {
    if (force || await this.showConfirm("Apakah Anda yakin ingin keluar?", "Konfirmasi Keluar")) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('lastActivityTime');
      this.data.currentUser = null;
      this.checkAuth();
      if (force) {
        this.showAlert("Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali.", "warning");
      }
    }
  },

  async hashPassword(password) {
    if (!password) return '';
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async login(username, password) {
    this.showLoading(true);
    document.getElementById('loginError').classList.add('hidden');
    
    try {

      const passwordHash = await this.hashPassword(password);
      
      if (this.data.apiUrl) {
        const res = await fetch(`${this.data.apiUrl}?action=LOGIN`, {
          method: 'POST',
          credentials: 'omit',
          body: JSON.stringify({ username, password: passwordHash })
        });
        const json = await res.json();
        
        if (json.status === 'success') {
          localStorage.setItem('currentUser', JSON.stringify(json.user));
          localStorage.setItem('sessionToken', json.token);
          this.data.currentUser = json.user;
          this.checkAuth();
          await this.loadData();
          this.navigate('dashboard');
        } else {
          document.getElementById('loginError').textContent = json.message || "Invalid username or password.";
          document.getElementById('loginError').classList.remove('hidden');
        }
      } else {
        document.getElementById('loginError').textContent = "API URL is missing. Secure login requires API.";
        document.getElementById('loginError').classList.remove('hidden');
      }
    } catch (e) {
      console.error("Login error:", e);
      document.getElementById('loginError').textContent = "Connection error. Please try again.";
      document.getElementById('loginError').classList.remove('hidden');
    } finally {
      this.showLoading(false);
    }
  },

  // === Navigation ===
  navigate(page) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (page === 'create-invoice') {
      this.renderCreateInvoiceInit();
    }
    if (page === 'users' && role !== 'super admin') {
      this.showAlert('Anda tidak memiliki akses ke Manajemen Pengguna.', 'error', 'Akses Ditolak');
      this.navigate('dashboard');
      return;
    }
    if ((page === 'menus' || page === 'reports' || page === 'settings' || page === 'create-invoice') && role !== 'admin' && role !== 'super admin') {
      this.showAlert('Anda tidak memiliki akses ke modul ini.', 'error', 'Akses Ditolak');
      this.navigate('dashboard');
      return;
    }

    const activeView = document.querySelector('.view.active');
    const viewId = 'view' + page.charAt(0).toUpperCase() + page.slice(1).replace('-', '');
    const newView = document.getElementById(viewId);

    if (activeView && activeView !== newView) {
      // 1. Add exit animation class to the old active view
      activeView.classList.add('exiting');
      
      // Update nav link active highlight state instantly for responsive feel
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const navEl = document.querySelector(`.nav-link[data-page="${page}"]`);
      if(navEl) {
        navEl.classList.add('active');
        navEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        this.updateNavIndicator(page);
      }

      // Wait for exit transition to complete before showing the new view
      setTimeout(() => {
        activeView.classList.remove('active', 'exiting');
        if (newView) {
          newView.classList.add('active');
          this.triggerPageSpecificRenders(page);
        }
      }, 150); // Snappy 150ms exit transition
    } else {
      // Direct switch on initial load or if same page
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      
      if(newView) newView.classList.add('active');
      
      const navEl = document.querySelector(`.nav-link[data-page="${page}"]`);
      if(navEl) {
        navEl.classList.add('active');
        navEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        this.updateNavIndicator(page);
      }
      this.triggerPageSpecificRenders(page);
    }
  },

  triggerPageSpecificRenders(page) {
    // Page specific renders
    try {
      if(page === 'dashboard') this.renderDashboard();
      if(page === 'menus') this.renderMenus();
      if(page === 'invoices') {
        // Only set default current month dates if there are no existing filters in state
        if (!this.invoiceState.filterDateFrom && !this.invoiceState.filterDateTo) {
          const today = new Date();
          const y = today.getFullYear();
          const m = today.getMonth();
          const firstDayStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
          const lastDay = new Date(y, m + 1, 0).getDate();
          const lastDayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

          this.invoiceState.filterDateFrom = firstDayStr;
          this.invoiceState.filterDateTo = lastDayStr;
        }

        const fromInput = document.getElementById('invoiceFilterDateFrom');
        const toInput = document.getElementById('invoiceFilterDateTo');
        if (fromInput) fromInput.value = this.invoiceState.filterDateFrom;
        if (toInput) toInput.value = this.invoiceState.filterDateTo;

        // Restore other filters
        const searchInput = document.getElementById('invoiceSearchText');
        const statusInput = document.getElementById('invoiceFilterStatus');
        if (searchInput) searchInput.value = this.invoiceState.searchQuery || '';
        if (statusInput) statusInput.value = this.invoiceState.filterStatus || 'all';

        this.renderInvoices();
      }
      if(page === 'create-invoice') this.renderCreateInvoiceInit();
      if(page === 'schedules') this.renderSchedules();
      if(page === 'users') this.renderUsers();
      if(page === 'settings') {
        document.getElementById('settingApiUrl').value = this.data.apiUrl;
        const paymentAccInput = document.getElementById('settingPaymentAccounts');
        if (paymentAccInput) paymentAccInput.value = localStorage.getItem('paymentAccounts') || '';
        const logoData = localStorage.getItem('businessLogo') || '';
        const urlInput = document.getElementById('settingLogoUrl');
        if (urlInput) {
          urlInput.value = logoData.startsWith('http') ? logoData : '';
        }
      }
      if(page === 'reports') {
        this.populateReportYearDropdown();
        this.toggleReportFilterInputs();
        this.renderReports();
      }
    } catch(err) {
      console.error("Navigation error on page:", page, err);
      this.showAlert("Terjadi kesalahan sistem saat memuat halaman " + page, "error");
    }
  },

  updateNavIndicator(page) {
    const indicator = document.querySelector('.nav-indicator');
    const activeTab = document.querySelector(`.nav-tab[data-page="${page}"]`);
    
    if (window.innerWidth <= 768) {
      if (indicator) {
        indicator.style.opacity = '0';
        indicator.style.pointerEvents = 'none';
      }
      return;
    }

    if (indicator && activeTab) {
      indicator.style.pointerEvents = 'none';
      
      // If indicator is not yet initialized, set it instantly
      const isFirstLoad = !indicator.style.width || indicator.style.width === '0px' || indicator.style.width === '0';
      if (isFirstLoad) {
        indicator.style.left = `${activeTab.offsetLeft}px`;
        indicator.style.width = `${activeTab.offsetWidth}px`;
        indicator.style.opacity = '1';
        return;
      }

      // Smooth slide on subsequent page switches
      indicator.style.opacity = '1';
      indicator.style.left = `${activeTab.offsetLeft}px`;
      indicator.style.width = `${activeTab.offsetWidth}px`;
    }
  },

  // === Data Layer ===
  async loadData(quiet = false) {
    if (!quiet) this.showLoading(true);
    if (!this.data.apiUrl) {
      // Load from LocalStorage
      this.data.menus = JSON.parse(localStorage.getItem('menus') || '[]');
      this.data.invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
      this.data.users = JSON.parse(localStorage.getItem('users') || '[]');
      this.data.schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    } else {
      // Load from Google Sheets
      try {
        const res = await fetch(`${this.data.apiUrl}?action=GET_INIT_DATA&token=${localStorage.getItem('sessionToken') || ''}`, { credentials: 'omit' });
        const json = await res.json();
        
        if (json.status === 'success' && json.data) {
          this.data.menus = json.data.Menus || [];
          localStorage.setItem('menus', JSON.stringify(this.data.menus));
          
          const invoices = json.data.Invoices || [];
          // Parse invoice items JSON
          this.data.invoices = invoices.map(inv => ({
            ...inv,
            items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
          }));
          localStorage.setItem('invoices', JSON.stringify(this.data.invoices));
          
          this.data.users = json.data.Users || [];
          localStorage.setItem('users', JSON.stringify(this.data.users));
          
          this.data.schedules = json.data.Schedules || [];
          localStorage.setItem('schedules', JSON.stringify(this.data.schedules));
        } else {
          if (json.message && json.message.includes("Unauthorized")) {
             localStorage.removeItem('currentUser');
             localStorage.removeItem('sessionToken');
             this.data.currentUser = null;
             this.checkAuth();
             this.showAlert("Sesi Anda telah berakhir atau tidak valid. Silakan login kembali.", "warning");
             return;
          }
          throw new Error(json.message || "Invalid response format");
        }
      } catch (e) {
        console.error("Error loading data", e);
        this.showAlert(`Gagal memuat data dari API Database: ${e.message}\nSilakan periksa URL Web App Google Sheets Anda di menu Settings.`, "error");
        if (!quiet) this.showLoading(false);
        throw e; // Lemparkan error agar fungsi pemanggil (seperti refreshData) tahu ini gagal!
      }
    }
    
    // Re-render currently active view to reflect newly loaded data
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) {
      const page = activeLink.getAttribute('data-page');
      this.navigate(page);
    }
    
    this.updateNotifications();
    
    if (!quiet) this.showLoading(false);
  },

  async fetchData(sheet) {
    if(!this.data.apiUrl) return [];
    try {
      const res = await fetch(`${this.data.apiUrl}?action=GET_ALL&sheet=${sheet}&token=${localStorage.getItem('sessionToken') || ''}`, { credentials: 'omit' });
      const json = await res.json();
      if(json.status === 'success') return json.data;
      return [];
    } catch(e) {
      throw e;
    }
  },

  async addRow(sheet, payload) {
    this.showLoading(true);
    const target = sheet.toLowerCase();
    const items = this.data[target] || [];
    
    // Check for duplicates
    if (!items.some(i => i.id == payload.id)) {
      items.push(payload);
      this.data[target] = items;
      localStorage.setItem(target, JSON.stringify(items));
      this.updateNotifications();
    }

    if (this.data.apiUrl) {
      try {
        const res = await fetch(`${this.data.apiUrl}?action=ADD_ROW&sheet=${sheet}`, { 
          method: 'POST', 
          credentials: 'omit', 
          body: JSON.stringify({ ...payload, token: localStorage.getItem('sessionToken') }) 
        });
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          const index = items.findIndex(i => i.id == json.data.id);
          if (index > -1) {
            items[index] = { ...items[index], ...json.data };
            this.data[target] = items;
            localStorage.setItem(target, JSON.stringify(items));
          }
        }
      } catch(e) {
        console.error(e);
        this.showAlert("Koneksi cloud gagal. Data tersimpan secara lokal dan akan disinkronkan nanti.", "warning");
      }
    }
    this.showLoading(false);
  },

  async updateRow(sheet, payload) {
    this.showLoading(true);
    const target = sheet.toLowerCase();
    const items = this.data[target] || [];
    const index = items.findIndex(i => i.id == payload.id);
    if(index > -1) {
      items[index] = payload;
      this.data[target] = items;
      localStorage.setItem(target, JSON.stringify(items));
      this.updateNotifications();
    }

    if (this.data.apiUrl) {
      try {
        const res = await fetch(`${this.data.apiUrl}?action=UPDATE_ROW&sheet=${sheet}`, { 
          method: 'POST', 
          credentials: 'omit', 
          body: JSON.stringify({ ...payload, token: localStorage.getItem('sessionToken') }) 
        });
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          const idx = items.findIndex(i => i.id == json.data.id);
          if (idx > -1) {
            items[idx] = { ...items[idx], ...json.data };
            this.data[target] = items;
            localStorage.setItem(target, JSON.stringify(items));
          }
        }
      } catch(e) {
        console.error(e);
        this.showAlert("Koneksi cloud gagal. Perubahan disimpan secara lokal.", "warning");
      }
    }
    this.showLoading(false);
  },

  async deleteRow(sheet, id) {
    this.showLoading(true);
    const target = sheet.toLowerCase();
    let items = this.data[target] || [];
    items = items.filter(i => i.id != id);
    this.data[target] = items;
    localStorage.setItem(target, JSON.stringify(items));
    this.updateNotifications();

    if (this.data.apiUrl) {
      try {
        await fetch(`${this.data.apiUrl}?action=DELETE_ROW&sheet=${sheet}&id=${id}&token=${localStorage.getItem('sessionToken') || ''}`, { credentials: 'omit' });
      } catch(e) {
        console.error(e);
        this.showAlert("Gagal menghapus data dari cloud server.", "error");
      }
    }
    this.showLoading(false);
  },

  // === Feature: Dashboard ===
  renderDashboard() {
    const paidInvoices = this.data.invoices.filter(i => i.status === 'Lunas');
    const unpaidInvoices = this.data.invoices.filter(i => i.status !== 'Lunas');
    
    document.getElementById('statTotalPaidInvoices').textContent = paidInvoices.length;
    document.getElementById('statTotalUnpaidInvoices').textContent = unpaidInvoices.length;
    
    let paidRevenue = 0;
    let unpaidRevenue = 0;

    this.data.invoices.forEach(inv => {
      const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
      const remaining = Number(inv.totalAmount) - paid;
      paidRevenue += paid;
      unpaidRevenue += (remaining > 0 ? remaining : 0);
    });
    
    document.getElementById('statTotalPaidRevenue').textContent = this.formatCurrency(paidRevenue);
    document.getElementById('statTotalUnpaidRevenue').textContent = this.formatCurrency(unpaidRevenue);

    // Populate Glassmorphism Tooltips
    const tpPaidInv = document.getElementById('tooltipPaidInvoices');
    if (tpPaidInv) {
      if (paidInvoices.length === 0) {
        tpPaidInv.innerHTML = '<em style="color: var(--color-text-muted);">Belum ada data pelunasan.</em>';
      } else {
        const sortedPaid = [...paidInvoices].sort((a,b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        const list = sortedPaid.slice(0, 5).map(i => `<div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 4px;"><span>• ${i.invoiceNumber}</span><strong style="color: var(--color-success);">${i.customerName.split(' ')[0]}</strong></div>`).join('');
        tpPaidInv.innerHTML = `<div style="font-weight: 700; color: var(--color-tooltip-title); margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">5 Invoice Lunas Terbaru</div>${list}${paidInvoices.length > 5 ? `<div style="margin-top: 8px; font-size: 11px; color: var(--color-primary); font-weight: 600;">+ ${paidInvoices.length - 5} invoice lunas lainnya</div>` : ''}`;
      }
    }
    
    const tpPaidRev = document.getElementById('tooltipPaidRevenue');
    if (tpPaidRev) {
      tpPaidRev.innerHTML = `<div style="font-weight: 700; color: var(--color-tooltip-title); margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Revenue Terkumpul</div><div style="color: var(--color-text-muted);">Total pendapatan uang nyata yang telah masuk ke kas dari <strong style="color: var(--color-tooltip-title);">${paidInvoices.length} Lunas</strong> dan DP dari <strong style="color: var(--color-tooltip-title);">${unpaidInvoices.filter(i => Number(i.paidAmount) > 0).length} Belum Lunas</strong>.</div>`;
    }

    const tpUnpaidInv = document.getElementById('tooltipUnpaidInvoices');
    if (tpUnpaidInv) {
      if (unpaidInvoices.length === 0) {
        tpUnpaidInv.innerHTML = '<em style="color: var(--color-text-muted);">Luar biasa, semua invoice lunas!</em>';
      } else {
        const sortedUnpaid = [...unpaidInvoices].sort((a,b) => new Date(a.cateringDate) - new Date(b.cateringDate));
        const list = sortedUnpaid.slice(0, 5).map(i => {
          const p = Number(i.paidAmount) || 0;
          const r = Number(i.totalAmount) - p;
          return `<div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 4px;"><span>• ${i.invoiceNumber}</span><strong style="color: var(--color-danger);">- ${this.formatCurrency(r)}</strong></div>`;
        }).join('');
        tpUnpaidInv.innerHTML = `<div style="font-weight: 700; color: var(--color-tooltip-title); margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Detail Tagihan (Top 5)</div>${list}${unpaidInvoices.length > 5 ? `<div style="margin-top: 8px; font-size: 11px; color: var(--color-danger); font-weight: 600;">+ ${unpaidInvoices.length - 5} invoice lain mengantre</div>` : ''}`;
      }
    }

    const tpUnpaidRev = document.getElementById('tooltipUnpaidRevenue');
    if (tpUnpaidRev) {
      tpUnpaidRev.innerHTML = `<div style="font-weight: 700; color: var(--color-tooltip-title); margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Potensi Pendapatan</div><div style="color: var(--color-text-muted);">Total tagihan yang belum tertagih dari <strong style="color: var(--color-tooltip-title);">${unpaidInvoices.length} transaksi aktif</strong>. Sisa pembayaran ini diharapkan segera masuk ke kas Anda.</div>`;
    }

    // Nearest Schedules Table
    const table = document.getElementById('nearestSchedulesTable');
    if (table) {
      table.innerHTML = '';
      
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const futureSchedules = this.data.invoices.filter(inv => {
        if (!inv.cateringDate) return false;
        const cDate = new Date(inv.cateringDate);
        return cDate >= today;
      });
      
      futureSchedules.sort((a, b) => new Date(a.cateringDate) - new Date(b.cateringDate));
      const nearest = futureSchedules.slice(0, 5);
      
      if (nearest.length === 0) {
        const noDataMsg = (this.data.language === 'en') ? 'No upcoming schedules.' : 'Tidak ada jadwal terdekat.';
        table.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
              ${noDataMsg}
            </td>
          </tr>
        `;
      } else {
        nearest.forEach(inv => {
          const paid = Number(inv.paidAmount) || 0;
          let statusBadge = '';
          if (inv.status === 'Lunas' || (paid >= inv.totalAmount && inv.totalAmount > 0)) {
            statusBadge = '<span style="color:var(--color-success); background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">Lunas</span>';
          } else if (inv.status === 'DP / Sebagian' || (paid > 0 && paid < inv.totalAmount)) {
            statusBadge = '<span style="color:#f59e0b; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">DP / Sebagian</span>';
          } else {
            statusBadge = '<span style="color:var(--color-danger); background:rgba(239,68,68,0.1); padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">Belum Lunas</span>';
          }

          table.innerHTML += `
            <tr class="interactive-table-row" onclick="app.reprintInvoice('${inv.id}')" title="Klik untuk lihat detail / cetak invoice">
              <td><strong>${this.escapeHTML(inv.customerName || '-')}</strong></td>
              <td><strong>${this.formatDate(inv.cateringDate)}</strong></td>
              <td>${this.escapeHTML(inv.cateringLocation || '-')}</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        });
      }
    }

    // Due Invoices Table (Max 5 closest unpaid/partial)
    const dueTable = document.getElementById('dueInvoicesTable');
    dueTable.innerHTML = '';
    
    const unpaid = this.data.invoices.filter(i => i.status !== 'Lunas' && i.cateringDate);
    const sortedDue = unpaid.sort((a, b) => new Date(a.cateringDate) - new Date(b.cateringDate)).slice(0, 5);
    
    if (sortedDue.length === 0) {
      dueTable.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted" style="padding: 2rem;">
            Tidak ada tagihan jatuh tempo terdekat.
          </td>
        </tr>
      `;
    } else {
      sortedDue.forEach(inv => {
        const paid = Number(inv.paidAmount) || 0;
        const remaining = Number(inv.totalAmount) - paid;
        
        let statusBadge = '';
        if (inv.status === 'DP / Sebagian' || (paid > 0 && paid < inv.totalAmount)) {
          statusBadge = '<span style="color:#f59e0b; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">DP / Sebagian</span>';
        } else {
          statusBadge = '<span style="color:var(--color-danger); background:rgba(239,68,68,0.1); padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">Belum Lunas</span>';
        }

        dueTable.innerHTML += `
          <tr class="interactive-table-row" onclick="app.reprintInvoice('${inv.id}')" title="Klik untuk lihat detail / cetak invoice">
            <td>${this.escapeHTML(inv.invoiceNumber)}</td>
            <td>${this.escapeHTML(inv.customerName || '-')}</td>
            <td><strong>${this.formatDate(inv.cateringDate)}</strong></td>
            <td>${this.formatCurrency(inv.totalAmount)}</td>
            <td style="color: var(--color-danger); font-weight: bold;">${this.formatCurrency(remaining)}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });
    }

    this.renderDashboardChart();
    this.renderDashCalendar();
  },

  renderDashCalendar() {
    const container = document.getElementById('dashCalDays');
    const label = document.getElementById('dashCalMonthYear');
    if (!container || !label) return;

    container.innerHTML = '';

    const monthNamesID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const monthNamesEN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthNames = (this.data.language === 'en') ? monthNamesEN : monthNamesID;

    const year = this.dashCalState.currentYear;
    const month = this.dashCalState.currentMonth;
    label.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Build schedule map for this month
    const scheduleMap = {};
    this.data.invoices.forEach(inv => {
      if (inv.cateringDate) {
        const d = this.getLocalYMD(inv.cateringDate);
        if (!scheduleMap[d]) scheduleMap[d] = { invoice: false, booking: false, meeting: false, invoices: [], schedules: [] };
        scheduleMap[d].invoice = true;
        scheduleMap[d].invoices.push(inv);
      }
    });
    this.data.schedules.forEach(sch => {
      if (sch.date) {
        const d = this.getLocalYMD(sch.date);
        if (!scheduleMap[d]) scheduleMap[d] = { invoice: false, booking: false, meeting: false, invoices: [], schedules: [] };
        if (sch.type === 'Meeting') {
          scheduleMap[d].meeting = true;
        } else {
          scheduleMap[d].booking = true;
        }
        scheduleMap[d].schedules.push(sch);
      }
    });

    // Today in Asia/Jakarta
    const todayStr = this.getLocalYMD(new Date());

    // Pad previous month cells
    for (let i = firstDay; i > 0; i--) {
      const d = prevMonthDays - i + 1;
      container.innerHTML += `<div class="dash-cal-cell other-month">${d}</div>`;
    }

    // Current month cells
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const ev = scheduleMap[dateStr];
      const isToday = dateStr === todayStr;

      let classes = 'dash-cal-cell';
      if (isToday) classes += ' today';
      else if (ev) {
        classes += ' has-event';
        if (ev.meeting) classes += ' has-meeting';
        else if (ev.booking) classes += ' has-booking';
      }

      let dotsHtml = '';
      let tooltipHtml = '';
      if (ev) {
        classes += ' tooltip-host';
        
        // Dots
        if (!isToday) {
          dotsHtml = '<div class="dash-cal-dots">';
          if (ev.invoice)  dotsHtml += `<span class="dash-cal-dot" style="background:var(--color-primary);"></span>`;
          if (ev.booking)  dotsHtml += `<span class="dash-cal-dot" style="background:#38bdf8;"></span>`;
          if (ev.meeting)  dotsHtml += `<span class="dash-cal-dot" style="background:#8b5cf6;"></span>`;
          dotsHtml += '</div>';
        }

        // Tooltip Content
        let tooltipContent = `<div style="margin-bottom: 5px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${this.formatDate(dateStr)}</div>`;
        const hasInvoice = ev.invoices.length > 0;
        const hasBooking = ev.schedules.filter(s => !s.type || s.type === 'Booking').length > 0;
        const hasMeeting = ev.schedules.filter(s => s.type === 'Meeting').length > 0;

        if (hasInvoice) {
          tooltipContent += `<div style="font-size: 11px; margin-bottom: 3px;"><span style="color: var(--color-primary)">•</span> ${ev.invoices.length} Katering</div>`;
        }
        if (hasBooking) {
          tooltipContent += `<div style="font-size: 11px; margin-bottom: 3px;"><span style="color: #38bdf8">•</span> ${ev.schedules.filter(s => !s.type || s.type === 'Booking').length} Booking Umum</div>`;
        }
        if (hasMeeting) {
          tooltipContent += `<div style="font-size: 11px; margin-bottom: 3px;"><span style="color: #8b5cf6">•</span> ${ev.schedules.filter(s => s.type === 'Meeting').length} Meeting</div>`;
        }

        let eventNames = [];
        ev.invoices.forEach(inv => eventNames.push(this.escapeHTML(inv.customerName || 'Customer')));
        ev.schedules.forEach(s => eventNames.push(this.escapeHTML(s.title || 'Event')));

        if (eventNames.length > 0) {
          tooltipContent += `<div style="font-size: 11px; color: var(--color-text-muted); margin-top: 5px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 5px;">`;
          tooltipContent += eventNames.slice(0, 3).join(', ');
          if (eventNames.length > 3) tooltipContent += `, dkk (+${eventNames.length - 3})`;
          tooltipContent += `</div>`;
        }

        tooltipHtml = `<div class="tooltip-content" style="width: max-content; min-width: 150px; text-align: left; z-index: 9999;">${tooltipContent}</div>`;
      }

      container.innerHTML += `<div class="${classes}">${day}${dotsHtml}${tooltipHtml}</div>`;
    }

    // Fill trailing cells so grid is always complete (6 rows = 42 cells)
    const totalCells = firstDay + totalDays;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      container.innerHTML += `<div class="dash-cal-cell other-month">${i}</div>`;
    }
  },

  dashCalPrev() {
    this.dashCalState.currentMonth--;
    if (this.dashCalState.currentMonth < 0) {
      this.dashCalState.currentMonth = 11;
      this.dashCalState.currentYear--;
    }
    this.renderDashCalendar();
  },

  dashCalNext() {
    this.dashCalState.currentMonth++;
    if (this.dashCalState.currentMonth > 11) {
      this.dashCalState.currentMonth = 0;
      this.dashCalState.currentYear++;
    }
    this.renderDashCalendar();
  },

  renderDashboardChart() {
    const isLightTheme = document.body.classList.contains('light-theme');

    // Group by month for the current year
    const currentYear = new Date().getFullYear();
    const currentYearStr = String(currentYear);

    const thisYearInvoices = this.data.invoices.filter(inv => {
      if (!inv.createdAt) return false;
      return inv.createdAt.substring(0, 4) === currentYearStr;
    });

    let totalOmset = 0;
    let countPaid = 0;
    let countUnpaid = 0;

    const monthlyPaid = Array(12).fill(0);
    const monthlyUnpaid = Array(12).fill(0);

    thisYearInvoices.forEach(inv => {
      const total = Number(inv.totalAmount) || 0;
      const paid = Number(inv.paidAmount) || 0;
      const remaining = total - paid;
      
      totalOmset += total;

      const isLunas = inv.status === 'Lunas' || (paid >= total && total > 0);
      if (isLunas) {
        countPaid++;
      } else {
        countUnpaid++;
      }

      // Group by month
      const monthIndex = parseInt(inv.createdAt.substring(5, 7), 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyPaid[monthIndex] += paid;
        monthlyUnpaid[monthIndex] += (remaining > 0 ? remaining : 0);
      }
    });

    // Render stats summary cards
    const omsetEl = document.getElementById('chartStatOmset');
    const terbayarEl = document.getElementById('chartStatTerbayar');
    const belumTerbayarEl = document.getElementById('chartStatBelumTerbayar');

    if (omsetEl) this.animateValue(omsetEl, 0, totalOmset, 1500, true);
    if (terbayarEl) terbayarEl.textContent = `${countPaid} Invoice`;
    const terbayarCountEl = document.getElementById('chartStatTerbayarCount');
    if (terbayarCountEl) terbayarCountEl.textContent = `${countPaid} Invoice`;
    if (belumTerbayarEl) belumTerbayarEl.textContent = `${countUnpaid} Invoice`;

    const canvas = document.getElementById('dashboardTrendChart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if(this.chartInstance) this.chartInstance.destroy();

      const monthNamesID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
      const themeBg = isLightTheme ? 'rgba(255,255,255,0.9)' : 'rgba(30,41,59,0.9)';
      const themeColor = isLightTheme ? '#0f172a' : '#f8fafc';
      const tooltipBorder = isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

      // Calculate total monthly revenue
      const monthlyTotal = monthlyPaid.map((p, i) => p + monthlyUnpaid[i]);

      // Create gradient for Area Chart
      const gradient = ctx.createLinearGradient(0, 0, 0, 100);
      gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
      gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: monthNamesID,
          datasets: [{
            label: 'Total Omset',
            data: monthlyTotal,
            borderColor: '#0ea5e9',
            backgroundColor: gradient,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#0ea5e9',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            fill: true,
            tension: 0.4 // Smooth curve
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: themeBg,
              titleColor: themeColor,
              bodyColor: themeColor,
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: function(context) {
                  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.parsed.y);
                }
              }
            }
          },
          scales: {
            x: { display: false },
            y: { display: false, min: 0 }
          },
          interaction: {
            mode: 'index',
            intersect: false,
          }
        }
      });
    }
  },

  // === Feature: Menus ===
  filterMenus() {
    const input = document.getElementById('menuSearchText');
    this.menuState.searchQuery = input ? input.value.toLowerCase().trim() : '';
    this.menuState.currentPage = 1;
    this.renderMenus();
  },

  clearMenuFilters() {
    const input = document.getElementById('menuSearchText');
    if (input) input.value = '';
    this.menuState.searchQuery = '';
    this.menuState.currentPage = 1;
    this.renderMenus();
  },

  renderMenus() {
    const tbody = document.getElementById('menusTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // 1. Filter
    let filtered = this.data.menus.filter(m => {
      const q = this.menuState.searchQuery;
      if (!q) return true;

      const nameMatch = m.name && String(m.name).toLowerCase().includes(q);
      const descMatch = m.description && String(m.description).toLowerCase().includes(q);
      const idMatch = m.id && String(m.id).toLowerCase().includes(q);

      return nameMatch || descMatch || idMatch;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      const aId = Number(a.id);
      const bId = Number(b.id);
      if (!isNaN(aId) && !isNaN(bId)) {
        return aId - bId;
      }
      return String(a.id).localeCompare(String(b.id));
    });

    // 3. Paginate (10 entries per page)
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.menuState.perPage) || 1;

    // Bound Check
    if (this.menuState.currentPage > totalPages) {
      this.menuState.currentPage = totalPages;
    }

    const startIndex = (this.menuState.currentPage - 1) * this.menuState.perPage;
    const endIndex = startIndex + this.menuState.perPage;
    const pageItems = filtered.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
      const noDataMsg = (this.data.language === 'en') ? 'No menus found.' : 'Tidak ada data menu.';
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
            <i data-lucide="utensils-crosshair" style="width: 40px; height: 40px; margin-bottom: 8px; color: #64748b; display: inline-block;"></i>
            <p style="font-size: 13px; font-weight: 500;">${noDataMsg}</p>
          </td>
        </tr>
      `;
    } else {
      pageItems.forEach(m => {
        const draftBadge = m.status === 'Draft' ? ' <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Draft</span>' : '';
        tbody.innerHTML += `
          <tr>
            <td>${this.escapeHTML(m.id)}</td>
            <td><strong>${this.escapeHTML(m.name)}</strong>${draftBadge}</td>
            <td>${this.formatCurrency(m.price)}</td>
            <td><span class="badge" style="background: rgba(212,175,55,0.1); color: var(--color-primary); padding: 4px 8px; border-radius: 4px; font-weight: 500;">${this.escapeHTML(m.unit || 'pax')}</span></td>
            <td><span class="text-muted">${this.escapeHTML(m.description || '-')}</span></td>
            <td>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-secondary btn-sm" onclick="app.editMenu('${m.id}')" title="Edit"><i data-lucide="edit-2" style="width:16px;"></i></button>
                <button class="btn btn-danger btn-sm" onclick="app.deleteMenu('${m.id}')" title="Delete"><i data-lucide="trash-2" style="width:16px;"></i></button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    lucide.createIcons();

    // 4. Render Pagination Controls
    this.renderMenusPagination(totalPages, totalItems);
  },

  renderMenusPagination(totalPages, totalItems) {
    const pagDiv = document.getElementById('menusPagination');
    if (!pagDiv) return;
    pagDiv.innerHTML = '';

    const startItem = (this.menuState.currentPage - 1) * this.menuState.perPage + 1;
    const endItem = Math.min(this.menuState.currentPage * this.menuState.perPage, totalItems);
    
    // Left side: Page Info text
    const infoText = this.data.language === 'en'
      ? `Showing ${totalItems > 0 ? startItem : 0} to ${endItem} of ${totalItems} entries`
      : `Menampilkan ${totalItems > 0 ? startItem : 0} sampai ${endItem} dari ${totalItems} menu`;
      
    const infoSpan = document.createElement('span');
    infoSpan.style.fontSize = '13px';
    infoSpan.style.color = 'var(--color-text-muted)';
    infoSpan.textContent = infoText;
    pagDiv.appendChild(infoSpan);

    // Right side: Button group
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '6px';

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary btn-sm';
    prevBtn.style.padding = '6px 10px';
    prevBtn.style.display = 'flex';
    prevBtn.style.alignItems = 'center';
    prevBtn.disabled = this.menuState.currentPage === 1;
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width:14px; height:14px;"></i>';
    prevBtn.onclick = () => {
      if (this.menuState.currentPage > 1) {
        this.menuState.currentPage--;
        this.renderMenus();
      }
    };
    btnGroup.appendChild(prevBtn);

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.menuState.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = i === this.menuState.currentPage ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      pageBtn.style.padding = '6px 12px';
      pageBtn.style.fontSize = '12px';
      pageBtn.style.fontWeight = i === this.menuState.currentPage ? '600' : 'normal';
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        this.menuState.currentPage = i;
        this.renderMenus();
      };
      btnGroup.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary btn-sm';
    nextBtn.style.padding = '6px 10px';
    nextBtn.style.display = 'flex';
    nextBtn.style.alignItems = 'center';
    nextBtn.disabled = this.menuState.currentPage === totalPages;
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width:14px; height:14px;"></i>';
    nextBtn.onclick = () => {
      if (this.menuState.currentPage < totalPages) {
        this.menuState.currentPage++;
        this.renderMenus();
      }
    };
    btnGroup.appendChild(nextBtn);

    pagDiv.appendChild(btnGroup);
    lucide.createIcons();
  },

  openAddMenuModal() {
    document.getElementById('menuForm').reset();
    document.getElementById('menuId').value = '';
    this.openModal('menuModal');
  },

  editMenu(id) {
    const menu = this.data.menus.find(m => m.id == id);
    if(menu) {
      document.getElementById('menuId').value = menu.id;
      document.getElementById('menuName').value = menu.name;
      document.getElementById('menuPrice').value = menu.price;
      document.getElementById('menuUnit').value = menu.unit || 'pax';
      document.getElementById('menuDesc').value = menu.description;
      this.openModal('menuModal');
    }
  },

  async deleteMenu(id) {
    if(await this.showConfirm("Apakah Anda yakin ingin menghapus menu ini?", "Hapus Menu")) {
      await this.deleteRow('Menus', id);
      this.renderMenus();
    }
  },

  async importExcel(e) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin' && role !== 'super admin') {
      this.showAlert("Anda tidak memiliki izin untuk mengimpor menu.", "error", "Akses Ditolak");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    this.showLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (!json || json.length === 0) {
          this.showAlert("File Excel kosong atau format tidak sesuai!", "error");
          this.showLoading(false);
          return;
        }

        let successCount = 0;
        let skippedCount = 0;
        let skippedNames = [];
        
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const name = row.name || row.Name || row.Nama || row.nama || row['Menu Name'] || row['Nama Menu'];
          const priceStr = row.price || row.Price || row.Harga || row.harga || 0;
          const description = row.description || row.Description || row.Deskripsi || row.deskripsi || '';

          if (!name) continue;
          
          const menuName = String(name).trim();
          const existing = this.data.menus.find(m => String(m.name).toLowerCase() === menuName.toLowerCase());
          
          if (existing) {
            skippedCount++;
            skippedNames.push(menuName);
            continue;
          }

          const price = Number(String(priceStr).replace(/[^0-9.-]+/g, '')) || 0;

          const payload = {
            id: (Date.now() + i).toString(),
            name: menuName,
            price: price,
            description: String(description).trim()
          };

          await this.addRow('Menus', payload);
          successCount++;
        }

        let alertMsg = `Berhasil mengimpor ${successCount} menu baru dari file Excel!`;
        if (skippedCount > 0) {
          alertMsg += `\n(${skippedCount} menu dilewati karena nama sudah ada: ${skippedNames.slice(0, 3).join(', ')}${skippedNames.length > 3 ? ', dll' : ''})`;
        }
        this.showAlert(alertMsg, "success");
        await this.loadData();
      } catch (err) {
        console.error(err);
        this.showAlert("Gagal memproses file Excel. Pastikan format kolom benar.", "error");
      } finally {
        this.showLoading(false);
        e.target.value = ''; // Reset file input
      }
    };

    reader.readAsArrayBuffer(file);
  },

  async saveMenu(e, isDraft = false) {
    if (e) e.preventDefault();
    const idField = document.getElementById('menuId').value;
    const isUpdate = !!idField;
    const menuName = document.getElementById('menuName').value.trim();
    
    const existing = this.data.menus.find(m => String(m.name).toLowerCase() === menuName.toLowerCase() && m.id != idField);
    if (existing) {
      this.showAlert(`Menu dengan nama "${menuName}" sudah ada! Silakan gunakan nama lain.`, "warning");
      return;
    }
    
    const payload = {
      id: isUpdate ? idField : Date.now().toString(),
      name: menuName,
      price: document.getElementById('menuPrice').value,
      unit: document.getElementById('menuUnit').value,
      description: document.getElementById('menuDesc').value,
      status: isDraft ? 'Draft' : 'Active'
    };

    if (isUpdate) {
      await this.updateRow('Menus', payload);
    } else {
      await this.addRow('Menus', payload);
    }

    this.closeModal('menuModal');
    this.renderMenus();
    document.getElementById('menuForm').reset();
    document.getElementById('menuId').value = '';
  },

  // === Feature: Invoices ===
  filterInvoices() {
    const searchInput = document.getElementById('invoiceSearchText');
    const statusInput = document.getElementById('invoiceFilterStatus');
    const dateFromInput = document.getElementById('invoiceFilterDateFrom');
    const dateToInput = document.getElementById('invoiceFilterDateTo');

    this.invoiceState.searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    this.invoiceState.filterStatus = statusInput ? statusInput.value : 'all';
    this.invoiceState.filterDateFrom = dateFromInput ? dateFromInput.value : '';
    this.invoiceState.filterDateTo = dateToInput ? dateToInput.value : '';
    this.invoiceState.currentPage = 1;
    this.renderInvoices();
  },

  clearInvoiceFilters() {
    const searchInput = document.getElementById('invoiceSearchText');
    const statusInput = document.getElementById('invoiceFilterStatus');
    const dateFromInput = document.getElementById('invoiceFilterDateFrom');
    const dateToInput = document.getElementById('invoiceFilterDateTo');

    if (searchInput) searchInput.value = '';
    if (statusInput) statusInput.value = 'all';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';

    this.invoiceState.searchQuery = '';
    this.invoiceState.filterStatus = 'all';
    this.invoiceState.filterDateFrom = '';
    this.invoiceState.filterDateTo = '';
    this.invoiceState.currentPage = 1;
    this.renderInvoices();
  },

  renderInvoices() {
    const table = document.getElementById('invoicesTable');
    if (!table) return;
    table.innerHTML = '';

    // 1. Filter
    let filtered = this.data.invoices.filter(inv => {
      // a. Text search
      const q = this.invoiceState.searchQuery;
      if (q) {
        const numMatch = inv.invoiceNumber && String(inv.invoiceNumber).toLowerCase().includes(q);
        const nameMatch = inv.customerName && String(inv.customerName).toLowerCase().includes(q);
        const locMatch = inv.cateringLocation && String(inv.cateringLocation).toLowerCase().includes(q);
        const phoneMatch = inv.customerPhone && String(inv.customerPhone).toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !locMatch && !phoneMatch) return false;
      }

      // b. Status filter
      const fs = this.invoiceState.filterStatus;
      if (fs && fs !== 'all') {
        const paid = Number(inv.paidAmount) || 0;
        const total = Number(inv.totalAmount) || 0;
        let derivedStatus;
        if (inv.status === 'Lunas' || (paid >= total && total > 0)) {
          derivedStatus = 'Lunas';
        } else if (paid > 0 && paid < total) {
          derivedStatus = 'DP / Sebagian';
        } else {
          derivedStatus = 'Belum Lunas';
        }
        if (derivedStatus !== fs) return false;
      }

      // c. Date range filter (berdasarkan tanggal katering)
      const dateFrom = this.invoiceState.filterDateFrom;
      const dateTo = this.invoiceState.filterDateTo;
      if (dateFrom && inv.cateringDate) {
        if (inv.cateringDate < dateFrom) return false;
      }
      if (dateTo && inv.cateringDate) {
        if (inv.cateringDate > dateTo) return false;
      }

      return true;
    });

    // 1b. Update filter result badge
    const badge = document.getElementById('invoiceFilterResultBadge');
    const badgeText = document.getElementById('invoiceFilterResultText');
    const isFiltered = this.invoiceState.searchQuery ||
      (this.invoiceState.filterStatus && this.invoiceState.filterStatus !== 'all') ||
      this.invoiceState.filterDateFrom ||
      this.invoiceState.filterDateTo;
    if (badge) {
      if (isFiltered) {
        badgeText.textContent = `${filtered.length} hasil`;
        badge.style.display = 'flex';
        lucide.createIcons({ nodes: [badge] });
      } else {
        badge.style.display = 'none';
      }
    }

    // 2. Paginate (10 entries per page)
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.invoiceState.perPage) || 1;

    // Bound Check
    if (this.invoiceState.currentPage > totalPages) {
      this.invoiceState.currentPage = totalPages;
    }

    const startIndex = (this.invoiceState.currentPage - 1) * this.invoiceState.perPage;
    const endIndex = startIndex + this.invoiceState.perPage;
    const pageItems = filtered.slice(startIndex, endIndex);

    // 3. Render rows
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    const showActions = (role === 'admin' || role === 'super admin');

    if (pageItems.length === 0) {
      const noDataMsg = (this.data.language === 'en') ? 'No invoices found.' : 'Tidak ada data invoice.';
      table.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
            <i data-lucide="file-warning" style="width: 40px; height: 40px; margin-bottom: 8px; color: #64748b; display: inline-block;"></i>
            <p style="font-size: 13px; font-weight: 500;">${noDataMsg}</p>
          </td>
        </tr>
      `;
    } else {
      pageItems.forEach(inv => {
        let statusBadge = '';
        if (inv.status === 'Lunas') {
          statusBadge = '<span style="color:var(--color-success); background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">Lunas</span>';
        } else if (inv.status === 'Draft') {
          statusBadge = '<span style="color:var(--color-text-muted); background:rgba(255,255,255,0.08); border: 1px solid var(--color-border); padding:3px 7px; border-radius:4px; font-size:12px;">Draft</span>';
        } else if (inv.status === 'DP / Sebagian' || (Number(inv.paidAmount) > 0 && Number(inv.paidAmount) < Number(inv.totalAmount))) {
          statusBadge = '<span style="color:#f59e0b; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">DP / Sebagian</span>';
        } else {
          statusBadge = '<span style="color:var(--color-danger); background:rgba(239,68,68,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">Belum Lunas</span>';
        }

        table.innerHTML += `
          <tr>
            <td>${this.escapeHTML(inv.invoiceNumber)}</td>
            <td>${this.escapeHTML(inv.customerName || '-')}</td>
            <td>${this.escapeHTML(inv.cateringLocation || '-')}</td>
            <td>${this.escapeHTML(this.formatPhone(inv.customerPhone))}</td>
            <td>${this.formatDate(inv.cateringDate)}</td>
            <td>${this.formatCurrency(inv.totalAmount)}</td>
            <td>${statusBadge}</td>
            <td>
              <div style="display:flex; gap:4px;">
                <button class="btn btn-secondary btn-sm" onclick="app.reprintInvoice('${inv.id}')" title="Print PDF"><i data-lucide="printer" style="width:16px;"></i></button>
                ${inv.status !== 'Draft' ? `<button class="btn btn-sm" style="background:#25d366; color:#fff; border:none; display:inline-flex; align-items:center; justify-content:center; padding:5px 6px;" onclick="app.sendWhatsAppReminder('${inv.id}')" title="Kirim Tagihan WA"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="display:inline-block;"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.93a7.9 7.9 0 0 0 1.08 3.968L0 16l4.237-1.11A7.9 7.9 0 0 0 7.994 16c4.366 0 7.923-3.56 7.927-7.93a7.88 7.88 0 0 0-2.32-5.744zM7.994 14.59a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.982c-.193-.097-1.14-.563-1.317-.627-.177-.064-.306-.097-.436.097-.13.193-.502.628-.616.757-.115.13-.23.144-.423.048-.19-.097-.803-.296-1.53-1.002-.566-.505-.948-1.13-1.059-1.324-.11-.193-.012-.298.085-.395.087-.088.193-.225.29-.338.097-.113.13-.19.193-.317.064-.13.033-.242-.016-.339-.049-.097-.436-1.05-.597-1.442-.158-.382-.332-.33-.456-.337-.117-.006-.252-.006-.388-.006-.135 0-.355.051-.54.253-.186.202-.71.694-.71 1.693s.729 1.96 1.83 2.112c.11.015 2.132 3.257 5.163 4.568.72.312 1.28.499 1.72.639.722.23 1.38.197 1.9.12.58-.088 1.14-.563 1.317-1.082.177-.518.177-.962.124-1.05-.053-.088-.19-.13-.383-.227z"/></svg></button>` : ''}
                ${showActions && inv.status !== 'Lunas' ? `<button class="btn btn-success btn-sm" onclick="app.markInvoicePaid('${inv.id}')" title="Tandai Lunas"><i data-lucide="check" style="width:16px;"></i></button>` : ''}
                ${showActions ? `<button class="btn btn-secondary btn-sm" onclick="app.editInvoice('${inv.id}')" title="Edit Invoice"><i data-lucide="edit-2" style="width:16px;"></i></button>` : ''}
                ${showActions ? `<button class="btn btn-danger btn-sm" onclick="app.deleteInvoice('${inv.id}')" title="Hapus Invoice"><i data-lucide="trash-2" style="width:16px;"></i></button>` : ''}
              </div>
            </td>
          </tr>
        `;
      });
    }

    lucide.createIcons();
    
    // 4. Render Pagination Controls
    this.renderInvoicesPagination(totalPages, totalItems);
  },

  renderInvoicesPagination(totalPages, totalItems) {
    const pagDiv = document.getElementById('invoicesPagination');
    if (!pagDiv) return;
    pagDiv.innerHTML = '';

    const startItem = (this.invoiceState.currentPage - 1) * this.invoiceState.perPage + 1;
    const endItem = Math.min(this.invoiceState.currentPage * this.invoiceState.perPage, totalItems);
    
    // Left side: Page Info text
    const infoText = this.data.language === 'en'
      ? `Showing ${totalItems > 0 ? startItem : 0} to ${endItem} of ${totalItems} entries`
      : `Menampilkan ${totalItems > 0 ? startItem : 0} sampai ${endItem} dari ${totalItems} invoice`;
      
    const infoSpan = document.createElement('span');
    infoSpan.style.fontSize = '13px';
    infoSpan.style.color = 'var(--color-text-muted)';
    infoSpan.textContent = infoText;
    pagDiv.appendChild(infoSpan);

    // Right side: Button group
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '6px';

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary btn-sm';
    prevBtn.style.padding = '6px 10px';
    prevBtn.style.display = 'flex';
    prevBtn.style.alignItems = 'center';
    prevBtn.disabled = this.invoiceState.currentPage === 1;
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width:14px; height:14px;"></i>';
    prevBtn.onclick = () => {
      if (this.invoiceState.currentPage > 1) {
        this.invoiceState.currentPage--;
        this.renderInvoices();
      }
    };
    btnGroup.appendChild(prevBtn);

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.invoiceState.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = i === this.invoiceState.currentPage ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      pageBtn.style.padding = '6px 12px';
      pageBtn.style.fontSize = '12px';
      pageBtn.style.fontWeight = i === this.invoiceState.currentPage ? '600' : 'normal';
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        this.invoiceState.currentPage = i;
        this.renderInvoices();
      };
      btnGroup.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary btn-sm';
    nextBtn.style.padding = '6px 10px';
    nextBtn.style.display = 'flex';
    nextBtn.style.alignItems = 'center';
    nextBtn.disabled = this.invoiceState.currentPage === totalPages;
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width:14px; height:14px;"></i>';
    nextBtn.onclick = () => {
      if (this.invoiceState.currentPage < totalPages) {
        this.invoiceState.currentPage++;
        this.renderInvoices();
      }
    };
    btnGroup.appendChild(nextBtn);

    pagDiv.appendChild(btnGroup);
    lucide.createIcons();
  },

  async loadGuestInvoice(invoiceNumber) {
    this.showLoading(true, "Memuat Invoice...");
    
    // Hide main layout and pageLogin since it's a guest view
    const appLayout = document.getElementById('appLayout');
    const pageLogin = document.getElementById('pageLogin');
    if (appLayout) appLayout.style.display = 'none';
    if (pageLogin) pageLogin.style.display = 'none';

    // Show guest layout
    const guestSec = document.getElementById('viewGuestInvoice');
    if (guestSec) guestSec.style.display = 'block';

    let inv = null;
    
    // Try local storage first (if they are running locally/demo mode)
    const localInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    inv = localInvoices.find(i => i.invoiceNumber === invoiceNumber);

    // If not local or not found, load from remote Google Sheet API
    if (!inv && this.data.apiUrl) {
      try {
        const res = await fetch(`${this.data.apiUrl}?action=GET_GUEST_INVOICE&invoiceNumber=${invoiceNumber}`, { credentials: 'omit' });
        const json = await res.json();
        if (json.status === 'success') {
          inv = json.data;
        }
      } catch (err) {
        console.error("Gagal memuat invoice dari cloud:", err);
      }
    }

    this.showLoading(false);

    if (!inv) {
      this.showAlert("Invoice tidak ditemukan atau link salah.", "error", "Gagal Memuat");
      return;
    }

    // Populate logo in guest invoice
    const logoImg = document.getElementById('guestInvoiceLogo');
    if (logoImg) {
      logoImg.src = localStorage.getItem('businessLogo') || 'logo.png';
    }

    // Populate text fields
    document.getElementById('guestInvoiceNumber').textContent = inv.invoiceNumber;
    document.getElementById('guestCustomerName').textContent = inv.customerName || '-';
    document.getElementById('guestCustomerPhone').textContent = this.formatPhone(inv.customerPhone);
    document.getElementById('guestCateringLocation').textContent = inv.cateringLocation || '-';
    document.getElementById('guestCateringCity').textContent = inv.cateringCity || inv.CateringCity || 'Serang';
    document.getElementById('guestCateringDate').textContent = this.formatDate(inv.cateringDate);
    document.getElementById('guestInvoiceDateCreated').textContent = this.formatDate(inv.createdAt);
    
    // Status
    const statusText = document.getElementById('guestInvoiceStatus');
    if (statusText) {
      statusText.textContent = inv.status;
      if (inv.status === 'Lunas') {
        statusText.style.color = '#10b981';
      } else if (inv.status === 'DP / Sebagian') {
        statusText.style.color = '#f59e0b';
      } else {
        statusText.style.color = '#ef4444';
      }
    }

    // Bank Payment Info
    const bankDetails = document.getElementById('guestPaymentAccountsText');
    if (bankDetails) {
      bankDetails.textContent = localStorage.getItem('paymentAccounts') || 'Transfer ke Rekening Resmi Poetry\'s Catering.';
    }

    // Items table
    const tableBody = document.getElementById('guestInvoiceTableBody');
    tableBody.innerHTML = '';
    let items = [];
    try {
      items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    } catch (e) {
      console.error(e);
    }

    items.forEach(item => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--color-border)';
      row.innerHTML = `
        <td style="padding: 10px 5px;">
          <strong style="color: var(--color-text);">${this.escapeHTML(item.name)}</strong>
          ${item.notes ? `<div style="font-size: 11px; color: var(--color-text-muted); margin-top: 2px;">Catatan: ${this.escapeHTML(item.notes)}</div>` : ''}
        </td>
        <td style="padding: 10px 5px; text-align: center;">${item.qty}</td>
        <td style="padding: 10px 5px; text-align: right;">${this.formatCurrency(item.price)}</td>
        <td style="padding: 10px 5px; text-align: right; font-weight: 600;">${this.formatCurrency(item.price * item.qty)}</td>
      `;
      tableBody.appendChild(row);
    });

    // Subtotals and Calculations
    const subtotal = Number(inv.subtotalAmount) || Number(inv.totalAmount) || 0;
    const additionalFee = Number(inv.additionalFee) || 0;
    const discountAmount = Number(inv.discountAmount) || 0;
    const totalAmount = Number(inv.totalAmount) || 0;
    const paidAmount = Number(inv.paidAmount) || 0;
    const remaining = totalAmount - paidAmount;

    document.getElementById('guestSubtotal').textContent = this.formatCurrency(subtotal);

    const discRow = document.getElementById('guestDiscountRow');
    if (discountAmount > 0) {
      discRow.style.display = 'flex';
      document.getElementById('guestDiscount').textContent = `-${this.formatCurrency(discountAmount)}`;
    } else {
      discRow.style.display = 'none';
    }

    const feeRow = document.getElementById('guestAdditionalFeeRow');
    if (additionalFee > 0) {
      feeRow.style.display = 'flex';
      document.getElementById('guestAdditionalFee').textContent = this.formatCurrency(additionalFee);
    } else {
      feeRow.style.display = 'none';
    }

    document.getElementById('guestTotalAmount').textContent = this.formatCurrency(totalAmount);
    document.getElementById('guestPaidAmount').textContent = this.formatCurrency(paidAmount);
    document.getElementById('guestRemainingBalance').textContent = this.formatCurrency(remaining >= 0 ? remaining : 0);

    // Notes
    const notesRow = document.getElementById('guestInvoiceNotesRow');
    const notesText = document.getElementById('guestInvoiceNotes');
    if (inv.notes && inv.notes.trim()) {
      notesRow.style.display = 'block';
      notesText.textContent = inv.notes;
    } else {
      notesRow.style.display = 'none';
    }
    
    lucide.createIcons();
  },

  sendWhatsAppReminder(id) {
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;

    const phone = this.formatPhoneForWA(inv.customerPhone);
    if (!phone) {
      this.showAlert("Nomor telepon kustomer tidak valid atau kosong.", "warning");
      return;
    }

    const customerName = inv.customerName || 'Kustomer';
    const invoiceNumber = inv.invoiceNumber;
    const cateringDate = this.formatDate(inv.cateringDate);
    const totalAmount = this.formatCurrency(inv.totalAmount);
    const paidAmount = this.formatCurrency(inv.paidAmount || 0);
    const remaining = Number(inv.totalAmount) - (Number(inv.paidAmount) || 0);
    const remainingText = this.formatCurrency(remaining >= 0 ? remaining : 0);

    // Parse items list to send in text
    let items = [];
    try {
      items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    } catch(e){}
    const menuSummary = items.map(item => `- ${item.qty}x ${item.name}`).join('\n');

    // Retrieve active bank accounts from local storage settings
    const bankDetails = localStorage.getItem('paymentAccounts') || '[Nama Bank] - [No Rekening] a.n [Nama Pemilik]';

    // Auto generate the online guest invoice link dynamically based on window.location
    const loc = window.location;
    const guestInvoiceLink = `${loc.protocol}//${loc.host}${loc.pathname}?invoice=${invoiceNumber}`;

    // Construct beautiful message
    let message = '';
    if (inv.status === 'Lunas' || remaining <= 0) {
      message = `Halo Kak *${customerName}*,\n\nTerima kasih banyak atas pembayaran Anda. Berikut adalah konfirmasi pelunasan invoice katering Anda:\n\n` +
        `* *No Invoice*: ${invoiceNumber}\n` +
        `* *Tanggal Event*: ${cateringDate}\n` +
        `* *Pesanan*:\n${menuSummary}\n\n` +
        `* *Total Tagihan*: ${totalAmount}\n` +
        `* *Status*: *LUNAS (Terbayar Penuh)*\n\n` +
        `Detail invoice resmi berlogo dapat diakses secara online di sini:\n${guestInvoiceLink}\n\n` +
        `Terima kasih telah mempercayakan kebutuhan konsumsi acara Anda kepada *Poetry's Catering*!`;
    } else {
      message = `Halo Kak *${customerName}*,\n\nKami dari *Poetry's Catering* ingin mengonfirmasi rincian tagihan pesanan katering Anda:\n\n` +
        `* *No Invoice*: ${invoiceNumber}\n` +
        `* *Tanggal Event*: ${cateringDate}\n` +
        `* *Pesanan*:\n${menuSummary}\n\n` +
        `* *Total Tagihan*: ${totalAmount}\n` +
        `* *Sudah Dibayar (DP)*: ${paidAmount}\n` +
        `* *Sisa Tagihan (Piutang)*: *${remainingText}*\n\n` +
        `Pembayaran sisa tagihan dapat ditransfer ke rekening resmi kami:\n${bankDetails}\n\n` +
        `Lihat & unduh file invoice resmi berlogo di sini:\n${guestInvoiceLink}\n\n` +
        `Mohon mengirimkan bukti transfer jika pembayaran telah dilakukan. Terima kasih banyak!`;
    }

    // Open WhatsApp
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  },

  reprintInvoice(id) {
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;

    // Show custom progress loading overlay
    const overlay = document.getElementById('detailLoadingOverlay');
    const percentText = document.getElementById('detailLoadingPercent');
    const progressBar = document.getElementById('detailLoadingBar');
    const loadingText = document.getElementById('detailLoadingText');

    if (overlay && percentText && progressBar) {
      percentText.textContent = '0%';
      progressBar.style.width = '0%';
      if (loadingText) loadingText.textContent = 'Mengambil data invoice...';
      overlay.classList.remove('hidden');
    }

    let progress = 0;

    // Smoothly increment progress to 85%
    const progressInterval = setInterval(() => {
      if (progress < 85) {
        progress += Math.floor(Math.random() * 8) + 3; // random increments
        if (progress > 85) progress = 85;
        
        if (percentText && progressBar) {
          percentText.textContent = `${progress}%`;
          progressBar.style.width = `${progress}%`;
        }
      }
    }, 45);

    document.getElementById('pdfCustName').textContent = inv.customerName || '-';
    document.getElementById('pdfCustPhone').textContent = this.formatPhone(inv.customerPhone);
    document.getElementById('pdfCatLocation').textContent = inv.cateringLocation || '-';
    document.getElementById('pdfInvNumber').textContent = inv.invoiceNumber;
    document.getElementById('pdfInvDate').textContent = this.formatDate(inv.createdAt);
    document.getElementById('pdfCatDate').textContent = this.formatDate(inv.cateringDate);
    
    const watermark = document.getElementById('pdfStatusWatermark');
    const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
    const remaining = Number(inv.totalAmount) - paid;
    
    if(inv.status === 'Lunas' || remaining <= 0) {
      watermark.textContent = 'LUNAS';
      watermark.style.color = 'rgba(16,185,129,0.18)';
      watermark.style.borderColor = 'rgba(16,185,129,0.18)';
    } else if (paid > 0) {
      watermark.textContent = 'LUNAS SEBAGIAN';
      watermark.style.color = 'rgba(245,158,11,0.18)';
      watermark.style.borderColor = 'rgba(245,158,11,0.18)';
    } else {
      watermark.textContent = 'BELUM LUNAS';
      watermark.style.color = 'rgba(239,68,68,0.18)';
      watermark.style.borderColor = 'rgba(239,68,68,0.18)';
    }
    
    const pdfTbody = document.getElementById('pdfItemsTableBody');
    pdfTbody.innerHTML = '';
    
    const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    items.forEach(item => {
      pdfTbody.innerHTML += `
        <tr>
          <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500;">${this.escapeHTML(item.name)}</td>
          <td style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #f1f5f9; color: #475569;">${this.formatCurrency(item.price)}</td>
          <td style="padding: 12px 15px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #475569;">${item.qty}</td>
          <td style="padding: 12px 15px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: 500;">${this.escapeHTML(item.unit || 'pax')}</td>
          <td style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">${this.formatCurrency(item.subtotal)}</td>
        </tr>
      `;
    });
    
    const finalPaid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
    const finalRemaining = Number(inv.totalAmount) - finalPaid;

    const subtotalVal = Number(inv.subtotalAmount) || Number(inv.totalAmount) || 0;
    const discType = inv.discountType || 'none';
    const discVal = Number(inv.discountValue) || 0;
    const discAmt = Number(inv.discountAmount) || 0;

    document.getElementById('pdfSubtotal').textContent = this.formatCurrency(subtotalVal);
    const pdfDiscRow = document.getElementById('pdfDiscountRow');
    if (pdfDiscRow) {
      if (discType !== 'none' && discAmt > 0) {
        document.getElementById('pdfDiscountInfo').textContent = discType === 'percent' ? `(${discVal}%)` : '';
        document.getElementById('pdfDiscountAmount').textContent = `- ${this.formatCurrency(discAmt)}`;
        pdfDiscRow.style.display = 'flex';
      } else {
        pdfDiscRow.style.display = 'none';
      }
    }

    const addFee = Number(inv.additionalFee) || 0;
    const pdfAddFeeRow = document.getElementById('pdfAdditionalFeeRow');
    if (pdfAddFeeRow) {
      if (addFee > 0) {
        document.getElementById('pdfAdditionalFeeAmount').textContent = this.formatCurrency(addFee);
        pdfAddFeeRow.style.display = 'flex';
      } else {
        pdfAddFeeRow.style.display = 'none';
      }
    }

    document.getElementById('pdfGrandTotal').textContent = this.formatCurrency(inv.totalAmount);
    document.getElementById('pdfPaidAmount').textContent = this.formatCurrency(finalPaid);
    document.getElementById('pdfRemainingBalance').textContent = this.formatCurrency(finalRemaining);

    // Render Dynamic Payment Accounts
    const paymentAccounts = localStorage.getItem('paymentAccounts');
    const paymentList = document.getElementById('pdfPaymentAccountsList');
    const paymentContainer = document.getElementById('pdfPaymentAccountsContainer');
    if (paymentContainer && paymentList) {
      if (paymentAccounts && paymentAccounts.trim() !== '') {
        paymentContainer.style.display = 'block';
        paymentList.innerHTML = paymentAccounts.trim().split('\n').map(acc => {
          return `<p style="margin: 0; font-size: 11px; color: #0f172a; font-weight: 600;">${this.escapeHTML(acc.trim())}</p>`;
        }).join('');
      } else {
        paymentContainer.style.display = 'none';
      }
    }


    const pdfNotesContainer = document.getElementById('pdfNotesContainer');
    const pdfNotes = document.getElementById('pdfNotes');
    if (pdfNotesContainer && pdfNotes) {
      if (inv.notes && inv.notes.trim()) {
        pdfNotes.textContent = inv.notes;
        pdfNotesContainer.style.display = 'block';
      } else {
        pdfNotesContainer.style.display = 'none';
        pdfNotes.textContent = '';
      }
    }

    // Generate Verification QR Code and wait for load
    const qrText = `Poetry's Catering Authentic Invoice\nInvoice No: ${inv.invoiceNumber}\nCustomer: ${inv.customerName || '-'}\nCatering Date: ${this.formatDate(inv.cateringDate)}\nTotal: ${this.formatCurrency(inv.totalAmount)}\nStatus: ${inv.status || 'Belum Lunas'}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;
    
    const qrImg = document.getElementById('pdfQrCode');
    
    // Simpan invoice number untuk konfirmasi cetak
    this.currentPrintInvoiceNumber = inv.invoiceNumber;
    
    // Helper to finish loading up to 100% and show modal
    const completeLoad = () => {
      clearInterval(progressInterval);
      if (loadingText) loadingText.textContent = 'Menampilkan preview...';
      
      const finishInterval = setInterval(() => {
        if (progress < 100) {
          progress += 5;
          if (progress > 100) progress = 100;
          if (percentText && progressBar) {
            percentText.textContent = `${progress}%`;
            progressBar.style.width = `${progress}%`;
          }
        } else {
          clearInterval(finishInterval);
          // Wait 100ms for visual satisfaction, then open
          setTimeout(() => {
            if (overlay) overlay.classList.add('hidden');
            this.openModal('pdfTemplateWrapper');
            lucide.createIcons();
          }, 150);
        }
      }, 15);
    };

    // Convert QR Code URL to base64 to prevent canvas taint (CORS issue)
    fetch(qrUrl)
      .then(response => {
        if (!response.ok) throw new Error('Fetch QR failed');
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          qrImg.src = reader.result;
          completeLoad();
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => {
        console.warn("Gagal memuat QR Code dengan CORS, gunakan fallback.", err);
        qrImg.crossOrigin = "anonymous";
        qrImg.onload = () => completeLoad();
        qrImg.onerror = () => completeLoad();
        qrImg.src = qrUrl;
      });
  },

  updateNotifications() {
    const badge = document.getElementById('notificationBadge');
    const countLabel = document.getElementById('notificationCountLabel');
    const listContainer = document.getElementById('notificationList');
    if (!badge || !listContainer) return;

    const todayStr = this.getLocalYMD(new Date());
    const dueInvoices = this.data.invoices.filter(inv => {
      if (!inv.cateringDate) return false;
      const paid = Number(inv.paidAmount) || 0;
      const total = Number(inv.totalAmount) || 0;
      const isLunas = inv.status === 'Lunas' || (paid >= total && total > 0);
      const cDate = inv.cateringDate.substring(0, 10);
      return !isLunas && cDate <= todayStr;
    });

    // Sort by cateringDate descending (most overdue / most recent first)
    dueInvoices.sort((a, b) => b.cateringDate.localeCompare(a.cateringDate));

    const count = dueInvoices.length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
      if (countLabel) countLabel.textContent = count;
    } else {
      badge.style.display = 'none';
      if (countLabel) countLabel.textContent = 0;
    }

    listContainer.innerHTML = '';
    if (count === 0) {
      listContainer.innerHTML = `
        <div class="notification-empty-state">
          <i data-lucide="check-circle" style="width: 24px; height: 24px; color: var(--color-success);"></i>
          <p style="margin: 0; font-size: 12px; font-weight: 500;">Semua tagihan lunas!</p>
          <p style="margin: 0; font-size: 10px; color: var(--color-text-muted);">Tidak ada invoice jatuh tempo yang belum dibayar.</p>
        </div>
      `;
    } else {
      dueInvoices.forEach(inv => {
        const paid = Number(inv.paidAmount) || 0;
        const total = Number(inv.totalAmount) || 0;
        const remaining = total - paid;
        const status = inv.status || 'Belum Lunas';
        const isDp = status === 'DP / Sebagian' || (paid > 0 && paid < total);
        
        const iconClass = isDp ? 'warning' : 'danger';
        const iconName = isDp ? 'alert-triangle' : 'alert-circle';
        const titleText = this.escapeHTML(inv.customerName || 'Pelanggan');
        const dateFormatted = this.formatDate(inv.cateringDate);
        const remainingFormatted = this.formatCurrency(remaining);
        const invoiceNum = this.escapeHTML(inv.invoiceNumber);

        listContainer.innerHTML += `
          <div class="notification-item" onclick="app.viewNotificationInvoice('${inv.id}')">
            <div class="notification-item-icon ${iconClass}">
              <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
            </div>
            <div class="notification-item-content">
              <span class="notification-item-title">${titleText} (${invoiceNum})</span>
              <span class="notification-item-desc">Sisa tagihan: <strong style="color:var(--color-danger);">${remainingFormatted}</strong></span>
              <span class="notification-item-date">Jatuh Tempo: ${dateFormatted}</span>
            </div>
          </div>
        `;
      });
    }
    lucide.createIcons({ nodes: [listContainer] });
  },

  viewNotificationInvoice(invoiceId) {
    // Close dropdown
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.remove('active');

    const inv = this.data.invoices.find(i => i.id == invoiceId);
    if (!inv) return;

    // Navigate to invoices view
    this.navigate('invoices');

    // Clear other filters and set search query to invoice number
    const searchInput = document.getElementById('invoiceSearchText');
    const statusInput = document.getElementById('invoiceFilterStatus');
    const dateFromInput = document.getElementById('invoiceFilterDateFrom');
    const dateToInput = document.getElementById('invoiceFilterDateTo');

    if (searchInput) searchInput.value = inv.invoiceNumber;
    if (statusInput) statusInput.value = 'all';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';

    this.invoiceState.searchQuery = inv.invoiceNumber.toLowerCase();
    this.invoiceState.filterStatus = 'all';
    this.invoiceState.filterDateFrom = '';
    this.invoiceState.filterDateTo = '';
    this.invoiceState.currentPage = 1;
    this.renderInvoices();
  },

  renderCreateInvoiceInit() {
    const select = document.getElementById('invMenuSelect');
    if (select) select.value = '';
    
    document.getElementById('invEditId').value = '';
    document.getElementById('invCustomerName').value = '';
    document.getElementById('invCustomerPhone').value = '';
    document.getElementById('invCateringLocation').value = '';
    document.getElementById('invCateringCity').value = 'Serang';
    document.getElementById('invCateringDate').value = '';
    document.getElementById('invPaidAmount').value = '0';
    document.getElementById('invAdditionalFee').value = '0';
    document.getElementById('invNotes').value = '';
    document.getElementById('invDiscountType').value = 'none';
    const discValInput = document.getElementById('invDiscountValue');
    if (discValInput) {
      discValInput.value = '0';
      discValInput.style.display = 'none';
    }
    document.getElementById('invDateCreated').valueAsDate = new Date();
    
    // Auto generate invoice number
    const invNum = 'INV-' + new Date().getTime().toString().slice(-6);
    document.getElementById('pdfInvNumber').textContent = invNum;
    
    this.currentInvoice.items = [];
    this.currentInvoice.additionalFee = 0;
    this.updateInvoiceItemsTable();
  },

  openCreateInvoiceModal() {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin' && role !== 'super admin') {
      this.showAlert("Anda tidak memiliki izin untuk menambah invoice.", "error", "Akses Ditolak");
      return;
    }
    this.navigate('create-invoice');
    lucide.createIcons();
  },

  editInvoice(id) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin' && role !== 'super admin') {
      this.showAlert("Anda tidak memiliki izin untuk mengedit invoice.", "error", "Akses Ditolak");
      return;
    }
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;
    
    // Clear menu selection trigger text for the edit modal
    const select = document.getElementById('editInvMenuSelect');
    if (select) select.value = '';

    document.getElementById('editInvId').value = inv.id;
    document.getElementById('editInvCustomerName').value = inv.customerName || '';
    document.getElementById('editInvCustomerPhone').value = this.formatPhone(inv.customerPhone);
    document.getElementById('editInvCateringLocation').value = inv.cateringLocation || '';
    document.getElementById('editInvCateringCity').value = inv.cateringCity || inv.CateringCity || 'Serang';
    document.getElementById('editInvPaidAmount').value = this.formatNumberToIndonesian(inv.paidAmount || 0);
    document.getElementById('editInvAdditionalFee').value = this.formatNumberToIndonesian(inv.additionalFee || 0);
    document.getElementById('editInvNotes').value = inv.notes || '';
    
    document.getElementById('editInvCateringDate').value = inv.cateringDate ? this.getLocalYMD(inv.cateringDate) : '';
    
    // Populate discount inputs in edit modal
    const discType = inv.discountType || 'none';
    const discValue = inv.discountValue || 0;
    const discTypeEl = document.getElementById('editInvDiscountType');
    if (discTypeEl) discTypeEl.value = discType;
    const discValEl = document.getElementById('editInvDiscountValue');
    if (discValEl) {
      discValEl.value = discType === 'nominal' ? this.formatNumberToIndonesian(discValue) : discValue;
      discValEl.style.display = discType === 'none' ? 'none' : 'inline-block';
    }
    
    // Load current items to temporary state
    this.editInvoiceState.items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    this.editInvoiceState.invoiceNumber = inv.invoiceNumber;
    this.editInvoiceState.subtotal = inv.subtotalAmount || inv.totalAmount || 0;
    this.editInvoiceState.discountType = discType;
    this.editInvoiceState.discountValue = discValue;
    this.editInvoiceState.discountAmount = inv.discountAmount || 0;
    this.editInvoiceState.additionalFee = inv.additionalFee || 0;
    this.editInvoiceState.total = inv.totalAmount || 0;
    
    this.updateEditInvoiceItemsTable();
    this.openModal('editInvoiceModal');
  },

  addEditInvoiceItem() {
    const menuName = document.getElementById('editInvMenuSelect').value;
    const qty = parseInt(document.getElementById('editInvMenuQty').value);
    
    if (!menuName || qty < 1) return;
    
    const menu = this.data.menus.find(m => m.name === menuName);
    if (menu) {
      this.editInvoiceState.items.push({
        menuId: menu.id,
        name: menu.name,
        price: menu.price,
        unit: menu.unit || 'pax',
        qty: qty,
        subtotal: menu.price * qty
      });
      this.updateEditInvoiceItemsTable();
      document.getElementById('editInvMenuSelect').value = ''; // clear input
    }
  },

  removeEditInvoiceItem(index) {
    this.editInvoiceState.items.splice(index, 1);
    this.updateEditInvoiceItemsTable();
  },

  updateEditInvoiceItemsTable() {
    const tbody = document.getElementById('editInvItemsTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let subtotal = 0;
    this.editInvoiceState.items.forEach((item, i) => {
      subtotal += item.subtotal;
      tbody.innerHTML += `
        <tr>
          <td style="padding: 8px; text-align: center;">${this.escapeHTML(item.name)}</td>
          <td style="text-align: center; padding: 8px;">${this.formatCurrency(item.price)}</td>
          <td style="text-align: center; padding: 8px;">
            <input type="text" inputmode="numeric" maxlength="4" value="${item.qty}"
              oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,4)"
              onblur="if(!this.value||parseInt(this.value)<1){this.value=1;} app.updateEditInvoiceItemQty(${i}, this.value)"
              style="width:90px; text-align:center; padding:4px 8px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px; font-weight:600;">
          </td>
          <td style="text-align: center; padding: 8px;"><span class="badge" style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-weight: 500;">${this.escapeHTML(item.unit || 'pax')}</span></td>
          <td style="text-align: center; padding: 8px; font-weight: 600;" id="edit-inv-item-sub-${i}">${this.formatCurrency(item.subtotal)}</td>
          <td style="text-align: center; padding: 8px;"><button type="button" class="btn btn-danger btn-sm" style="padding: 4px 8px;" onclick="app.removeEditInvoiceItem(${i})"><i data-lucide="trash-2" style="width:14px; height: 14px;"></i></button></td>
        </tr>
      `;
    });
    
    const discTypeEl = document.getElementById('editInvDiscountType');
    const discValEl = document.getElementById('editInvDiscountValue');
    const discLabelEl = document.getElementById('editInvDiscountLabel');
    
    const discountType = discTypeEl ? discTypeEl.value : 'none';
    const discountValue = discValEl ? (Number(discValEl.value) || 0) : 0;
    let discountAmount = 0;
    
    if (discountType === 'percent') {
      discountAmount = Math.round(subtotal * (discountValue / 100));
    } else if (discountType === 'nominal') {
      discountAmount = discountValue;
    }
    
    const grandTotal = Math.max(0, subtotal - discountAmount);
    
    const subtotalEl = document.getElementById('editInvSubtotal');
    if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
    
    const discountRow = document.getElementById('editInvDiscountRow');
    if (discountRow) {
      if (discountType !== 'none' && discountAmount > 0) {
        discountRow.style.display = 'flex';
      } else {
        discountRow.style.display = 'none';
      }
    }
    if (discLabelEl) {
      discLabelEl.textContent = `- ${this.formatCurrency(discountAmount)}`;
    }
    
    document.getElementById('editInvGrandTotal').textContent = this.formatCurrency(grandTotal);
    
    // Dynamic Sisa Tagihan (Remaining Balance)
    const paidInput = document.getElementById('editInvPaidAmount');
    const paidAmount = paidInput ? (Number(paidInput.value) || 0) : 0;
    const remainingBalance = Math.max(0, grandTotal - paidAmount);
    const remainingEl = document.getElementById('editInvRemainingBalance');
    if (remainingEl) {
      remainingEl.textContent = this.formatCurrency(remainingBalance);
      remainingEl.className = 'remaining-balance-value ' + 
        (remainingBalance === 0 ? 'paid-full' : (paidAmount > 0 ? 'paid-partial' : 'paid-none'));
    }
    
    this.editInvoiceState.subtotal = subtotal;
    this.editInvoiceState.discountType = discountType;
    this.editInvoiceState.discountValue = discountValue;
    this.editInvoiceState.discountAmount = discountAmount;
    this.editInvoiceState.total = grandTotal;
    
    lucide.createIcons();
  },

  async saveEditedInvoice(e, statusOverride = null) {
    if (e) e.preventDefault();
    const id = document.getElementById('editInvId').value;
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;
    
    const subtotalAmount = this.editInvoiceState.subtotal || 0;
    const discountType = this.editInvoiceState.discountType || 'none';
    const discountValue = this.editInvoiceState.discountValue || 0;
    const discountAmount = this.editInvoiceState.discountAmount || 0;
    const totalAmount = this.editInvoiceState.total || 0;
    const paidAmount = this.parseIndonesianToNumber(document.getElementById('editInvPaidAmount').value);
    const additionalFee = this.parseIndonesianToNumber(document.getElementById('editInvAdditionalFee').value);
    const notes = document.getElementById('editInvNotes').value.trim();
    
    let status = paidAmount >= totalAmount ? 'Lunas' : (paidAmount > 0 ? 'DP / Sebagian' : 'Belum Lunas');
    if (statusOverride) {
      status = statusOverride;
    }
    
    const payload = {
      ...inv,
      customerName: document.getElementById('editInvCustomerName').value.trim(),
      customerPhone: document.getElementById('editInvCustomerPhone').value.trim(),
      cateringLocation: document.getElementById('editInvCateringLocation').value.trim(),
      cateringCity: document.getElementById('editInvCateringCity').value,
      CateringCity: document.getElementById('editInvCateringCity').value,
      cateringDate: document.getElementById('editInvCateringDate').value,
      paidAmount: paidAmount,
      subtotalAmount: subtotalAmount,
      discountType: discountType,
      discountValue: discountValue,
      discountAmount: discountAmount,
      additionalFee: additionalFee,
      notes: notes,
      totalAmount: totalAmount,
      status: status,
      items: JSON.stringify(this.editInvoiceState.items)
    };
    
    this.showLoading(true, "Menyimpan Perubahan...");
    
    try {
      await this.updateRow('Invoices', payload);
      this.closeModal('editInvoiceModal');
      this.renderInvoices();
      this.renderDashboard();
      this.renderSchedules(true); // Refresh calendar schedules
      this.showAlert("Perubahan invoice berhasil disimpan!", "success");
    } catch (err) {
      console.error(err);
      this.showAlert("Gagal menyimpan perubahan invoice.", "error");
    } finally {
      this.showLoading(false);
    }
  },

  async deleteInvoice(id) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin' && role !== 'super admin') {
      this.showAlert("Anda tidak memiliki izin untuk menghapus invoice.", "error", "Akses Ditolak");
      return;
    }
    if(await this.showConfirm("Hapus Invoice ini? Data yang dihapus tidak dapat dikembalikan.", "Hapus Invoice")) {
      await this.deleteRow('Invoices', id);
      this.renderInvoices();
      this.renderDashboard();
    }
  },

  async markInvoicePaid(id) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin' && role !== 'super admin') {
      this.showAlert("Anda tidak memiliki izin untuk memperbarui status pembayaran invoice.", "error", "Akses Ditolak");
      return;
    }
    const inv = this.data.invoices.find(i => i.id == id);
    if(!inv) return;
    
    const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
    const remaining = Number(inv.totalAmount) - paid;
    
    document.getElementById('payoffInvoiceId').value = inv.id;
    document.getElementById('payoffInvoiceNumber').textContent = inv.invoiceNumber;
    document.getElementById('payoffTotalAmount').textContent = this.formatCurrency(inv.totalAmount);
    document.getElementById('payoffPaidAmount').textContent = this.formatCurrency(paid);
    document.getElementById('payoffRemainingAmount').textContent = this.formatCurrency(remaining);
    
    this.currentRemainingPayoff = remaining;
    
    const amountInput = document.getElementById('payoffAmountInput');
    if (amountInput) {
      amountInput.value = remaining;
      amountInput.max = remaining;
    }
    
    this.openModal('paymentPayoffModal');
    lucide.createIcons();
  },

  autoFillPayoff() {
    const amountInput = document.getElementById('payoffAmountInput');
    if (amountInput && this.currentRemainingPayoff !== undefined) {
      amountInput.value = this.currentRemainingPayoff;
    }
  },

  async savePaymentPayoff(e) {
    e.preventDefault();
    const id = document.getElementById('payoffInvoiceId').value;
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;
    
    const amountInput = document.getElementById('payoffAmountInput');
    const addAmount = Number(amountInput.value);
    
    if (isNaN(addAmount) || addAmount <= 0) {
      this.showAlert("Nominal pelunasan tidak valid.", "error");
      return;
    }
    
    const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
    const newPaid = paid + addAmount;
    const status = newPaid >= inv.totalAmount ? 'Lunas' : 'DP / Sebagian';
    
    const payload = { ...inv };
    payload.items = typeof inv.items === 'string' ? inv.items : JSON.stringify(inv.items);
    payload.paidAmount = newPaid;
    payload.status = status;
    
    this.showLoading(true, "Menyimpan Pelunasan...");
    
    try {
      await this.updateRow('Invoices', payload);
      this.closeModal('paymentPayoffModal');
      this.renderInvoices();
      this.renderDashboard();
      this.renderSchedules(true);
      this.showAlert("Pembayaran pelunasan berhasil disimpan!", "success");
    } catch (err) {
      console.error(err);
      this.showAlert("Gagal menyimpan pelunasan.", "error");
    } finally {
      this.showLoading(false);
    }
  },

  addInvoiceItem() {
    const menuName = document.getElementById('invMenuSelect').value;
    const qty = parseInt(document.getElementById('invMenuQty').value);
    
    if(!menuName || qty < 1) return;
    
    const menu = this.data.menus.find(m => m.name === menuName);
    if(menu) {
      this.currentInvoice.items.push({
        menuId: menu.id,
        name: menu.name,
        price: menu.price,
        unit: menu.unit || 'pax',
        qty: qty,
        subtotal: menu.price * qty
      });
      this.updateInvoiceItemsTable();
      document.getElementById('invMenuSelect').value = ''; // clear input
    }
  },

  removeInvoiceItem(index) {
    this.currentInvoice.items.splice(index, 1);
    this.updateInvoiceItemsTable();
  },

  updateInvoiceItemQty(index, val) {
    const qty = Math.max(1, parseInt(val) || 1);
    const item = this.currentInvoice.items[index];
    if (!item) return;
    item.qty = qty;
    item.subtotal = item.price * qty;
    // Update only the subtotal cell — no table re-render
    const subCell = document.getElementById(`inv-item-sub-${index}`);
    if (subCell) subCell.textContent = this.formatCurrency(item.subtotal);
    this.recalcCreateInvoiceTotals();
  },

  updateEditInvoiceItemQty(index, val) {
    const qty = Math.max(1, parseInt(val) || 1);
    const item = this.editInvoiceState.items[index];
    if (!item) return;
    item.qty = qty;
    item.subtotal = item.price * qty;
    // Update only the subtotal cell — no table re-render
    const subCell = document.getElementById(`edit-inv-item-sub-${index}`);
    if (subCell) subCell.textContent = this.formatCurrency(item.subtotal);
    this.recalcEditInvoiceTotals();
  },

  recalcCreateInvoiceTotals() {
    const subtotal = this.currentInvoice.items.reduce((s, it) => s + it.subtotal, 0);
    const discTypeEl = document.getElementById('invDiscountType');
    const discValEl = document.getElementById('invDiscountValue');
    const discLabelEl = document.getElementById('invDiscountLabel');
    const discountType = discTypeEl ? discTypeEl.value : 'none';
    const discountValue = discValEl ? (discountType === 'percent' ? (Number(discValEl.value) || 0) : this.parseIndonesianToNumber(discValEl.value)) : 0;
    let discountAmount = 0;
    if (discountType === 'percent') discountAmount = Math.round(subtotal * (discountValue / 100));
    else if (discountType === 'nominal') discountAmount = discountValue;
    
    const addFeeEl = document.getElementById('invAdditionalFee');
    const additionalFee = addFeeEl ? this.parseIndonesianToNumber(addFeeEl.value) : 0;
    
    const grandTotal = Math.max(0, subtotal - discountAmount + additionalFee);
    const subtotalEl = document.getElementById('invSubtotal');
    if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
    const discountRow = document.getElementById('invDiscountRow');
    if (discountRow) {
      if (discountType !== 'none' && discountAmount > 0) {
        discountRow.style.display = 'flex';
      } else {
        discountRow.style.display = 'none';
      }
    }
    if (discLabelEl) {
      discLabelEl.textContent = discountAmount > 0 ? `- ${this.formatCurrency(discountAmount)}` : '';
    }
    document.getElementById('invGrandTotal').textContent = this.formatCurrency(grandTotal);
    
    // Dynamic Sisa Tagihan (Remaining Balance)
    const paidInput = document.getElementById('invPaidAmount');
    const paidAmount = paidInput ? this.parseIndonesianToNumber(paidInput.value) : 0;
    const remainingBalance = Math.max(0, grandTotal - paidAmount);
    const remainingEl = document.getElementById('invRemainingBalance');
    if (remainingEl) {
      remainingEl.textContent = this.formatCurrency(remainingBalance);
      remainingEl.className = 'remaining-balance-value ' + 
        (remainingBalance === 0 ? 'paid-full' : (paidAmount > 0 ? 'paid-partial' : 'paid-none'));
    }

    this.currentInvoice.subtotal = subtotal;
    this.currentInvoice.discountType = discountType;
    this.currentInvoice.discountValue = discountValue;
    this.currentInvoice.discountAmount = discountAmount;
    this.currentInvoice.additionalFee = additionalFee;
    this.currentInvoice.total = grandTotal;
  },

  recalcEditInvoiceTotals() {
    const subtotal = this.editInvoiceState.items.reduce((s, it) => s + it.subtotal, 0);
    const discTypeEl = document.getElementById('editInvDiscountType');
    const discValEl = document.getElementById('editInvDiscountValue');
    const discLabelEl = document.getElementById('editInvDiscountLabel');
    const discountType = discTypeEl ? discTypeEl.value : 'none';
    const discountValue = discValEl ? (discountType === 'percent' ? (Number(discValEl.value) || 0) : this.parseIndonesianToNumber(discValEl.value)) : 0;
    let discountAmount = 0;
    if (discountType === 'percent') discountAmount = Math.round(subtotal * (discountValue / 100));
    else if (discountType === 'nominal') discountAmount = discountValue;
    
    const addFeeEl = document.getElementById('editInvAdditionalFee');
    const additionalFee = addFeeEl ? this.parseIndonesianToNumber(addFeeEl.value) : 0;
    
    const grandTotal = Math.max(0, subtotal - discountAmount + additionalFee);
    const subtotalEl = document.getElementById('editInvSubtotal');
    if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
    const discountRow = document.getElementById('editInvDiscountRow');
    if (discountRow) {
      if (discountType !== 'none' && discountAmount > 0) {
        discountRow.style.display = 'flex';
      } else {
        discountRow.style.display = 'none';
      }
    }
    if (discLabelEl) {
      discLabelEl.textContent = discountAmount > 0 ? `- ${this.formatCurrency(discountAmount)}` : '';
    }
    document.getElementById('editInvGrandTotal').textContent = this.formatCurrency(grandTotal);
    
    // Dynamic Sisa Tagihan (Remaining Balance)
    const paidInput = document.getElementById('editInvPaidAmount');
    const paidAmount = paidInput ? this.parseIndonesianToNumber(paidInput.value) : 0;
    const remainingBalance = Math.max(0, grandTotal - paidAmount);
    const remainingEl = document.getElementById('editInvRemainingBalance');
    if (remainingEl) {
      remainingEl.textContent = this.formatCurrency(remainingBalance);
      remainingEl.className = 'remaining-balance-value ' + 
        (remainingBalance === 0 ? 'paid-full' : (paidAmount > 0 ? 'paid-partial' : 'paid-none'));
    }

    this.editInvoiceState.subtotal = subtotal;
    this.editInvoiceState.discountType = discountType;
    this.editInvoiceState.discountValue = discountValue;
    this.editInvoiceState.discountAmount = discountAmount;
    this.editInvoiceState.additionalFee = additionalFee;
    this.editInvoiceState.total = grandTotal;
  },

  updateInvoiceItemsTable() {
    const tbody = document.getElementById('invItemsTable');
    tbody.innerHTML = '';
    let subtotal = 0;
    
    this.currentInvoice.items.forEach((item, i) => {
      subtotal += item.subtotal;
      tbody.innerHTML += `
        <tr>
          <td>${this.escapeHTML(item.name)}</td>
          <td>${this.formatCurrency(item.price)}</td>
          <td>
            <input type="text" inputmode="numeric" maxlength="4" value="${item.qty}"
              oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,4)"
              onblur="if(!this.value||parseInt(this.value)<1){this.value=1;} app.updateInvoiceItemQty(${i}, this.value)"
              style="width:90px; text-align:center; padding:4px 8px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); color:var(--color-text); font-size:13px; font-weight:600;">
          </td>
          <td><span class="badge" style="background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; font-weight: 500;">${this.escapeHTML(item.unit || 'pax')}</span></td>
          <td id="inv-item-sub-${i}">${this.formatCurrency(item.subtotal)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="app.removeInvoiceItem(${i})"><i data-lucide="trash-2" style="width:16px;"></i></button></td>
        </tr>
      `;
    });
    
    const discTypeEl = document.getElementById('invDiscountType');
    const discValEl = document.getElementById('invDiscountValue');
    const discLabelEl = document.getElementById('invDiscountLabel');
    
    const discountType = discTypeEl ? discTypeEl.value : 'none';
    const discountValue = discValEl ? (Number(discValEl.value) || 0) : 0;
    let discountAmount = 0;
    
    if (discountType === 'percent') {
      discountAmount = Math.round(subtotal * (discountValue / 100));
    } else if (discountType === 'nominal') {
      discountAmount = discountValue;
    }
    const grandTotal = Math.max(0, subtotal - discountAmount);
    
    const subtotalEl = document.getElementById('invSubtotal');
    if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
    
    const discountRow = document.getElementById('invDiscountRow');
    if (discountRow) {
      if (discountType !== 'none' && discountAmount > 0) {
        discountRow.style.display = 'flex';
      } else {
        discountRow.style.display = 'none';
      }
    }
    if (discLabelEl) {
      discLabelEl.textContent = `- ${this.formatCurrency(discountAmount)}`;
    }
    
    document.getElementById('invGrandTotal').textContent = this.formatCurrency(grandTotal);
    
    // Dynamic Sisa Tagihan (Remaining Balance)
    const paidInput = document.getElementById('invPaidAmount');
    const paidAmount = paidInput ? (Number(paidInput.value) || 0) : 0;
    const remainingBalance = Math.max(0, grandTotal - paidAmount);
    const remainingEl = document.getElementById('invRemainingBalance');
    if (remainingEl) {
      remainingEl.textContent = this.formatCurrency(remainingBalance);
      remainingEl.className = 'remaining-balance-value ' + 
        (remainingBalance === 0 ? 'paid-full' : (paidAmount > 0 ? 'paid-partial' : 'paid-none'));
    }
    
    this.currentInvoice.subtotal = subtotal;
    this.currentInvoice.discountType = discountType;
    this.currentInvoice.discountValue = discountValue;
    this.currentInvoice.discountAmount = discountAmount;
    this.currentInvoice.total = grandTotal;
    
    lucide.createIcons();
  },

  async saveInvoice(isDraft = false) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin' && role !== 'super admin') {
      this.showAlert("Anda tidak memiliki izin untuk menyimpan invoice.", "error", "Akses Ditolak");
      return;
    }
    const editId = document.getElementById('invEditId').value;
    const custName = document.getElementById('invCustomerName').value.trim();
    const custPhone = document.getElementById('invCustomerPhone').value.trim();
    const catLocation = document.getElementById('invCateringLocation').value.trim();
    const catCity = document.getElementById('invCateringCity').value;
    const catDate = document.getElementById('invCateringDate').value;
    const invDate = document.getElementById('invDateCreated').value;
    const paidAmount = this.parseIndonesianToNumber(document.getElementById('invPaidAmount').value);
    const additionalFee = this.parseIndonesianToNumber(document.getElementById('invAdditionalFee').value);
    const notes = document.getElementById('invNotes').value.trim();
    
    if (isDraft) {
      if (!custName) {
        this.showAlert("Mohon lengkapi minimal Nama Customer untuk menyimpan draft.", "warning");
        return;
      }
    } else {
      if(!custName || !custPhone || !catLocation || !catDate || this.currentInvoice.items.length === 0) {
        this.showAlert("Mohon lengkapi: Nama Customer, Telepon, Lokasi, Tanggal Katering, dan minimal 1 menu.", "warning");
        return;
      }
    }

    const isUpdate = !!editId;
    let invNum = isUpdate ? document.getElementById('pdfInvNumber').textContent : 'INV-' + new Date().getTime().toString().slice(-6);
    
    let status = 'Belum Lunas';
    if (isDraft) {
      status = 'Draft';
    } else if (paidAmount > 0) {
      if (paidAmount >= this.currentInvoice.total) {
        status = 'Lunas';
      } else {
        status = 'DP / Sebagian';
      }
    }

    const payload = {
      id: isUpdate ? editId : Date.now().toString(),
      invoiceNumber: invNum,
      customerName: custName,
      customerPhone: custPhone,
      cateringLocation: catLocation,
      cateringCity: catCity,
      CateringCity: catCity,
      cateringDate: catDate,
      items: JSON.stringify(this.currentInvoice.items),
      subtotalAmount: this.currentInvoice.subtotal || this.currentInvoice.total,
      discountType: this.currentInvoice.discountType || 'none',
      discountValue: this.currentInvoice.discountValue || 0,
      discountAmount: this.currentInvoice.discountAmount || 0,
      additionalFee: additionalFee,
      notes: notes,
      totalAmount: this.currentInvoice.total,
      paidAmount: paidAmount,
      createdAt: invDate,
      status: status
    };

    // Save to DB
    if(isUpdate) {
      await this.updateRow('Invoices', payload);
    } else {
      await this.addRow('Invoices', payload);
    }
    
    // Navigate back to invoices list
    this.navigate('invoices');
  },

  confirmPrintInvoice() {
    try {
      if (this.currentPrintInvoiceNumber) {
        this.generatePDF(this.currentPrintInvoiceNumber);
      } else {
        this.showAlert("Nomor invoice pratinjau tidak ditemukan di state aplikasi.", "warning");
      }
    } catch (err) {
      this.showAlert("Gagal memproses cetak invoice: " + err.message, "error");
    }
  },

  generatePDF(fileName) {
    try {
      const pdfEl = document.getElementById('pdfContent');
      if (!pdfEl) {
        this.showAlert('Elemen konten invoice tidak ditemukan di halaman.', 'error');
        return;
      }

      // Resolve jsPDF class safely supporting all versions/globals
      let jsPDFClass = null;
      if (typeof window.jsPDF !== 'undefined') {
        jsPDFClass = window.jsPDF;
      } else if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
        jsPDFClass = window.jspdf.jsPDF;
      }

      const hasHtml2Canvas = typeof html2canvas !== 'undefined';
      const hasJsPDF = jsPDFClass !== null;

      if (!hasHtml2Canvas || !hasJsPDF) {
        this.showAlert(`Library cetak PDF belum termuat sepenuhnya.\nhtml2canvas: ${hasHtml2Canvas ? 'OK' : 'Belum termuat'}\njsPDF: ${hasJsPDF ? 'OK' : 'Belum termuat'}\nSilakan refresh halaman dan coba kembali.`, 'warning');
        return;
      }

      this.showLoading(true, 'Menyiapkan PDF...');

      // 1. Force safe system font to prevent Web Font tainting in Safari/Firefox
      const originalFont = pdfEl.style.fontFamily;
      pdfEl.style.fontFamily = 'Arial, Helvetica, sans-serif';

      // 2. Hide SVGs which often cause DOMException: The operation is insecure
      const svgs = pdfEl.querySelectorAll('svg');
      const svgOriginals = [];
      svgs.forEach(svg => {
        svgOriginals.push({ el: svg, display: svg.style.display });
        svg.style.display = 'none';
      });

      // 3. Hide ALL images that are not base64 data URIs (local files cause Canvas Taint on file:// protocol)
      const taintedImages = [];
      const images = pdfEl.querySelectorAll('img');
      images.forEach(img => {
        const src = img.src || '';
        if (!src.startsWith('data:')) {
          taintedImages.push({ element: img, originalDisplay: img.style.display });
          img.style.display = 'none';
        }
      });

      // Helper function to restore the DOM after PDF generation
      const restoreDOM = () => {
        pdfEl.style.fontFamily = originalFont;
        svgs.forEach((svg, i) => { svg.style.display = svgOriginals[i].display; });
        taintedImages.forEach(item => { 
          item.element.style.display = item.originalDisplay; 
        });
      };

      // Wait 150ms for browser DOM to actually apply the new image sources before capturing
      setTimeout(() => {
        // Render canvas with safety settings (useCORS: false, allowTaint: false) to guarantee no security errors
        html2canvas(pdfEl, { 
          scale: 2, 
          useCORS: false, 
          allowTaint: false, 
          logging: true,
          imageTimeout: 4000 
        })
          .then(canvas => {
            // Canvas is guaranteed clean and exportable
            return canvas.toDataURL('image/png');
          })
          .then(imgData => {
            let pdf;
            try {
              pdf = new jsPDFClass('p', 'mm', 'a4');
            } catch (e) {
              throw new Error('Gagal membuat objek PDF baru: ' + e.message);
            }

            // Safe dimension calculations
            const pdfWidth = typeof pdf.internal.pageSize.getWidth === 'function'
              ? pdf.internal.pageSize.getWidth()
              : (pdf.internal.pageSize.width || 210);
              
            const pdfHeight = (pdfEl.offsetHeight * pdfWidth) / pdfEl.offsetWidth;
            
            try {
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            } catch (e) {
              throw new Error('Gagal menyisipkan tangkapan layar ke halaman PDF: ' + e.message);
            }

            try {
              pdf.save(fileName + '.pdf');
            } catch (e) {
              throw new Error('Gagal menyimpan file PDF: ' + e.message);
            }
            
            restoreDOM();
            this.showLoading(false);
            this.closeModal('pdfTemplateWrapper');
          })
          .catch(err => {
            console.error('PDF generation failure:', err);
            restoreDOM();
            this.showLoading(false);
            this.showAlert('Proses pembuatan PDF gagal: ' + err.message, 'error');
          });
      }, 150);
    } catch (globalErr) {
      console.error('Global catch inside generatePDF:', globalErr);
      this.showLoading(false);
      this.showAlert('Terjadi kesalahan tak terduga: ' + globalErr.message, 'error');
    }
  },

  // === Feature: Schedules ===
  filterSchedules() {
    const nameInput = document.getElementById('scheduleSearchName');
    this.scheduleState.searchName = nameInput ? nameInput.value.toLowerCase().trim() : '';
    
    // If searching, we clear the selected calendar date to search globally
    if (this.scheduleState.searchName) {
      this.scheduleState.selectedDate = '';
      const label = document.getElementById('selectedDateLabel');
      if (label) label.textContent = (this.data.language === 'en') ? 'All Schedules' : 'Semua Jadwal';
      this.renderCalendar();
    }
    
    this.scheduleState.currentPage = 1; // Reset to page 1
    this.renderSchedules(false);
  },

  clearScheduleFilters() {
    const nameInput = document.getElementById('scheduleSearchName');
    if (nameInput) nameInput.value = '';
    
    this.scheduleState.searchName = '';
    this.scheduleState.selectedDate = '';
    this.scheduleState.currentPage = 1;
    
    const label = document.getElementById('selectedDateLabel');
    if (label) label.textContent = (this.data.language === 'en') ? 'All Schedules' : 'Semua Jadwal';
    
    this.renderCalendar();
    this.renderSchedules(false);
  },

  toggleScheduleSort() {
    this.scheduleState.sortAsc = !this.scheduleState.sortAsc;
    
    const sortIcon = document.getElementById('sortIcon');
    const sortText = document.getElementById('sortText');
    if (sortIcon && sortText) {
      if (this.scheduleState.sortAsc) {
        sortIcon.setAttribute('data-lucide', 'arrow-up');
        sortText.textContent = 'Ascending';
      } else {
        sortIcon.setAttribute('data-lucide', 'arrow-down');
        sortText.textContent = 'Descending';
      }
      lucide.createIcons();
    }
    
    this.renderSchedules(false);
  },

  renderCalendar() {
    const daysContainer = document.getElementById('calendarDays');
    const monthYearLabel = document.getElementById('calendarMonthYear');
    if (!daysContainer || !monthYearLabel) return;
    
    daysContainer.innerHTML = '';
    
    const monthNamesID = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const monthNamesEN = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthNames = (this.data.language === 'en') ? monthNamesEN : monthNamesID;
    
    const year = this.scheduleState.currentYear;
    const month = this.scheduleState.currentMonth;
    
    monthYearLabel.textContent = `${monthNames[month]} ${year}`;
    
    // First day of the month
    const firstDay = new Date(year, month, 1).getDay();
    // Number of days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Previous month total days (for padding)
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Schedules in this month
    // Map of YYYY-MM-DD -> object {invoices: [], schedules: []}
    const scheduleMap = {};
    
    this.data.invoices.forEach(inv => {
      if (inv.cateringDate) {
        const dateStr = this.getLocalYMD(inv.cateringDate);
        if (!scheduleMap[dateStr]) scheduleMap[dateStr] = { invoices: [], schedules: [] };
        scheduleMap[dateStr].invoices.push(inv);
      }
    });

    this.data.schedules.forEach(sch => {
      if (sch.date) {
        const dateStr = this.getLocalYMD(sch.date);
        if (!scheduleMap[dateStr]) scheduleMap[dateStr] = { invoices: [], schedules: [] };
        scheduleMap[dateStr].schedules.push(sch);
      }
    });

    // Render empty slots/previous month days
    for (let i = firstDay; i > 0; i--) {
      const d = prevMonthDays - i + 1;
      daysContainer.innerHTML += `
        <div style="padding: 10px 0; color: rgba(255,255,255,0.15); font-size: 13px; text-align: center; pointer-events: none;">${d}</div>
      `;
    }
    
    // Render current month days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = scheduleMap[dateStr];
      const hasInvoice = dayData && dayData.invoices.length > 0;
      const hasBooking = dayData && dayData.schedules.some(s => (!s.type || s.type === 'Booking'));
      const hasMeeting = dayData && dayData.schedules.some(s => s.type === 'Meeting');
      const hasAny = hasInvoice || hasBooking || hasMeeting;
      const isSelected = this.scheduleState.selectedDate === dateStr;
      
      let style = `
        padding: 10px 0;
        font-size: 13px;
        text-align: center;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      `;
      
      let dayClass = 'calendar-day';
      if (isSelected) {
        style += `
          background: var(--color-primary) !important;
          border: 1.5px solid var(--color-primary) !important;
          color: #fff !important;
          font-weight: 700;
        `;
      } else if (hasAny) {
        let borderColor = hasInvoice ? 'rgba(212, 175, 55, 0.4)' : (hasMeeting ? 'rgba(139, 92, 246, 0.4)' : 'rgba(56, 189, 248, 0.4)');
        let bgColor = hasInvoice ? 'rgba(212, 175, 55, 0.08)' : (hasMeeting ? 'rgba(139, 92, 246, 0.08)' : 'rgba(56, 189, 248, 0.08)');
        style += `
          background: ${bgColor};
          border: 1.5px dashed ${borderColor};
          color: var(--color-text);
          font-weight: 600;
        `;
      } else {
        style += `
          color: var(--color-text-muted);
        `;
      }
      
      // Dot indicator under day number
      let dotHtml = '';
      let tooltipHtml = '';
      
      if (hasAny) {
        dotHtml += `<div style="position: absolute; bottom: 3px; left: 0; right: 0; display: flex; justify-content: center; gap: 3px;">`;
        if (hasInvoice) {
          dotHtml += `<span style="width: 5px; height: 5px; background: var(--color-primary); border-radius: 50%;"></span>`;
        }
        if (hasBooking) {
          dotHtml += `<span style="width: 5px; height: 5px; background: #38bdf8; border-radius: 50%;"></span>`;
        }
        if (hasMeeting) {
          dotHtml += `<span style="width: 5px; height: 5px; background: #8b5cf6; border-radius: 50%;"></span>`;
        }
        dotHtml += `</div>`;
        
        // Construct Tooltip
        let tooltipContent = `<div style="margin-bottom: 5px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">${this.formatDate(dateStr)}</div>`;
        if (hasInvoice) {
          tooltipContent += `<div style="font-size: 11px; margin-bottom: 3px;"><span style="color: var(--color-primary)">•</span> ${dayData.invoices.length} Katering</div>`;
        }
        if (hasBooking) {
          tooltipContent += `<div style="font-size: 11px; margin-bottom: 3px;"><span style="color: #38bdf8">•</span> ${dayData.schedules.filter(s => !s.type || s.type === 'Booking').length} Booking Umum</div>`;
        }
        if (hasMeeting) {
          tooltipContent += `<div style="font-size: 11px; margin-bottom: 3px;"><span style="color: #8b5cf6">•</span> ${dayData.schedules.filter(s => s.type === 'Meeting').length} Meeting</div>`;
        }
        
        let eventNames = [];
        dayData.invoices.forEach(inv => eventNames.push(this.escapeHTML(inv.customerName || 'Customer')));
        dayData.schedules.forEach(s => eventNames.push(this.escapeHTML(s.title || 'Event')));
        
        if (eventNames.length > 0) {
          tooltipContent += `<div style="font-size: 11px; color: var(--color-text-muted); margin-top: 5px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 5px;">`;
          tooltipContent += eventNames.slice(0, 3).join(', ');
          if (eventNames.length > 3) tooltipContent += `, dkk (+${eventNames.length - 3})`;
          tooltipContent += `</div>`;
        }
        
        tooltipHtml = `<div class="tooltip-content" style="width: max-content; min-width: 150px; text-align: left; z-index: 9999;">${tooltipContent}</div>`;
        dayClass += ' tooltip-host';
      }
      
      daysContainer.innerHTML += `
        <div class="${dayClass}" style="${style}" onclick="app.selectCalendarDate('${dateStr}')">
          ${day}
          ${dotHtml}
          ${tooltipHtml}
        </div>
      `;
    }
  },

  selectCalendarDate(dateStr) {
    if (this.scheduleState.selectedDate === dateStr) {
      // Toggle off if clicked again
      this.scheduleState.selectedDate = '';
    } else {
      this.scheduleState.selectedDate = dateStr;
    }
    
    // Update active label
    const label = document.getElementById('selectedDateLabel');
    if (label) {
      if (this.scheduleState.selectedDate) {
        label.textContent = this.formatDate(this.scheduleState.selectedDate);
      } else {
        label.textContent = (this.data.language === 'en') ? 'All Schedules' : 'Semua Jadwal';
      }
    }
    
    this.scheduleState.currentPage = 1;
    this.renderCalendar();
    this.renderSchedules(false);
  },

  prevMonth() {
    this.scheduleState.currentMonth--;
    if (this.scheduleState.currentMonth < 0) {
      this.scheduleState.currentMonth = 11;
      this.scheduleState.currentYear--;
    }
    this.renderCalendar();
  },

  nextMonth() {
    this.scheduleState.currentMonth++;
    if (this.scheduleState.currentMonth > 11) {
      this.scheduleState.currentMonth = 0;
      this.scheduleState.currentYear++;
    }
    this.renderCalendar();
  },

  renderSchedules(resetInputs = true) {
    if (resetInputs) {
      this.scheduleState.currentPage = 1;
      this.scheduleState.searchName = '';
      this.scheduleState.selectedDate = '';
      this.scheduleState.currentMonth = new Date().getMonth();
      this.scheduleState.currentYear = new Date().getFullYear();
      this.scheduleState.sortAsc = true;
      
      const nameInput = document.getElementById('scheduleSearchName');
      if (nameInput) nameInput.value = '';
      
      const label = document.getElementById('selectedDateLabel');
      if (label) label.textContent = (this.data.language === 'en') ? 'All Schedules' : 'Semua Jadwal';
      
      this.renderCalendar();
    }

    const container = document.getElementById('schedulesContainer');
    if (!container) return;
    container.innerHTML = '';
    
    // 1. Combine Data
    const combinedSchedules = [];
    
    // Add invoices
    this.data.invoices.forEach(inv => {
      if (!inv.cateringDate) return;
      const itemsArr = typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : (inv.items || []);
      const escapedItems = itemsArr.map(i => i.qty + 'x ' + this.escapeHTML(i.name)).join(', ');
      combinedSchedules.push({
        _rawDate: inv.cateringDate,
        title: `${this.escapeHTML(inv.customerName || 'Unknown')} - ${this.escapeHTML(inv.invoiceNumber)}`,
        subtitle: `<i data-lucide="phone" style="width:14px; vertical-align:middle;"></i> ${this.escapeHTML(this.formatPhone(inv.customerPhone))}`,
        details: escapedItems ? `Items: ${escapedItems}` : '',
        badgeText: 'Invoice',
        badgeColor: 'var(--color-primary)'
      });
    });

    // Add standalone schedules
    this.data.schedules.forEach(sch => {
      if (!sch.date) return;
      const isDraft = sch.status === 'Draft';
      const draftBadge = isDraft ? ' <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 6px; vertical-align: middle;">DRAFT</span>' : '';
      combinedSchedules.push({
        _isStandalone: true,
        _rawId: sch.id,
        _rawDate: sch.date,
        title: this.escapeHTML(sch.title || 'Untitled') + draftBadge,
        subtitle: `<i data-lucide="map-pin" style="width:14px; vertical-align:middle;"></i> ${this.escapeHTML(sch.location || '-')}`,
        details: sch.notes ? `Catatan: ${this.escapeHTML(sch.notes)}` : '',
        badgeText: this.escapeHTML(sch.type || 'Booking'),
        badgeColor: sch.type === 'Meeting' ? '#8b5cf6' : '#38bdf8'
      });
    });

    // 2. Filter
    let filtered = combinedSchedules.filter(item => {
      const matchName = !this.scheduleState.searchName || 
        (String(item.title).toLowerCase().includes(this.scheduleState.searchName.toLowerCase()));
        
      let matchDate = true;
      if (this.scheduleState.selectedDate) {
        const itemDateOnly = this.getLocalYMD(item._rawDate);
        matchDate = (itemDateOnly === this.scheduleState.selectedDate);
      }
      return matchName && matchDate;
    });

    // 3. Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a._rawDate);
      const dateB = new Date(b._rawDate);
      return this.scheduleState.sortAsc ? (dateA - dateB) : (dateB - dateA);
    });

    // 4. Paginate
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.scheduleState.perPage) || 1;
    
    if (this.scheduleState.currentPage > totalPages) {
      this.scheduleState.currentPage = totalPages;
    }
    
    const startIndex = (this.scheduleState.currentPage - 1) * this.scheduleState.perPage;
    const endIndex = startIndex + this.scheduleState.perPage;
    const pageItems = filtered.slice(startIndex, endIndex);

    // 5. Render Items
    if (pageItems.length === 0) {
      const noSchedulesMsg = (this.data.language === 'en') ? 'No catering schedules found.' : 'Tidak ada jadwal yang cocok.';
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
          <i data-lucide="calendar-off" style="width: 48px; height: 48px; margin-bottom: 12px; color: #64748b; display: inline-block;"></i>
          <p style="font-size: 14px; font-weight: 500;">${noSchedulesMsg}</p>
        </div>
      `;
      lucide.createIcons();
    } else {
      pageItems.forEach(item => {
        const d = new Date(item._rawDate);
        let day = '-';
        let month = '-';
        if (!isNaN(d.getTime())) {
          try {
            day = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric' });
            const locale = (this.data.language === 'en') ? 'en-US' : 'id-ID';
            month = d.toLocaleDateString(locale, { timeZone: 'Asia/Jakarta', month: 'short' });
          } catch(e) {
            day = d.getDate() || '-';
            const locale = (this.data.language === 'en') ? 'en-US' : 'id-ID';
            month = d.toLocaleString(locale, { month: 'short' });
          }
        }

        let timeHtml = '';
        if (item._rawDate && item._rawDate.includes('T') && item._rawDate.includes(':')) {
          const dObj = new Date(item._rawDate);
          if (!isNaN(dObj.getTime())) {
            try {
              const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Jakarta',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const parts = formatter.formatToParts(dObj);
              const hrs = parts.find(p => p.type === 'hour').value;
              const mins = parts.find(p => p.type === 'minute').value;
              timeHtml = `<span style="background: rgba(255, 255, 255, 0.08); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px; vertical-align: middle;"><i data-lucide="clock" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-right: 3px; margin-top: -2px;"></i>${hrs}:${mins} WIB</span>`;
            } catch(e) {
              const hrs = String(dObj.getHours()).padStart(2, '0');
              const mins = String(dObj.getMinutes()).padStart(2, '0');
              timeHtml = `<span style="background: rgba(255, 255, 255, 0.08); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px; vertical-align: middle;"><i data-lucide="clock" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-right: 3px; margin-top: -2px;"></i>${hrs}:${mins} WIB</span>`;
            }
          }
        }

        const actionsHtml = item._isStandalone ? `
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn btn-secondary btn-sm" onclick="app.editSchedule('${item._rawId}')" style="padding: 4px 8px; font-size: 11px;"><i data-lucide="edit" style="width:12px; height: 12px; margin-right: 4px;"></i> Edit</button>
            <button class="btn btn-danger btn-sm" onclick="app.deleteSchedule('${item._rawId}')" style="padding: 4px 8px; font-size: 11px;"><i data-lucide="trash-2" style="width:12px; height: 12px; margin-right: 4px;"></i> Hapus</button>
          </div>
        ` : '';

        container.innerHTML += `
          <div class="timeline-item" style="position: relative;">
            <div style="position: absolute; top: 0; right: 0; background: ${item.badgeColor}; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-bottom-left-radius: 8px; text-transform: uppercase;">
              ${item.badgeText}
            </div>
            <div class="timeline-date">
              <div class="day">${day}</div>
              <div class="month">${month}</div>
            </div>
            <div class="timeline-content" style="flex: 1; padding-top: 8px;">
              <h4 style="font-weight: 600;">${item.title}${timeHtml}</h4>
              <p>${item.subtitle}</p>
              ${item.details ? `<p style="margin-top:0.5rem; color:var(--color-primary); font-weight: 500;">${item.details}</p>` : ''}
              ${actionsHtml}
            </div>
          </div>
        `;
      });
      lucide.createIcons();
    }

    // 5. Render Pagination Bar
    this.renderSchedulesPagination(totalPages, totalItems);
  },

  renderSchedulesPagination(totalPages, totalItems) {
    const pagDiv = document.getElementById('schedulesPagination');
    if (!pagDiv) return;
    pagDiv.innerHTML = '';

    if (totalItems <= this.scheduleState.perPage) {
      pagDiv.style.display = 'none';
      return;
    }
    pagDiv.style.display = 'flex';

    // Prev Button
    const prevDisabled = this.scheduleState.currentPage === 1;
    pagDiv.innerHTML += `
      <button class="btn btn-secondary btn-sm" onclick="app.setSchedulePage(${this.scheduleState.currentPage - 1})" ${prevDisabled ? 'disabled' : ''} style="padding: 6px 12px; min-width: 40px; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="chevron-left" style="width: 16px;"></i>
      </button>
    `;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
      const isActive = i === this.scheduleState.currentPage;
      pagDiv.innerHTML += `
        <button class="btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="app.setSchedulePage(${i})" style="padding: 6px 12px; min-width: 36px; font-weight: ${isActive ? 'bold' : 'normal'};">
          ${i}
        </button>
      `;
    }

    // Next Button
    const nextDisabled = this.scheduleState.currentPage === totalPages;
    pagDiv.innerHTML += `
      <button class="btn btn-secondary btn-sm" onclick="app.setSchedulePage(${this.scheduleState.currentPage + 1})" ${nextDisabled ? 'disabled' : ''} style="padding: 6px 12px; min-width: 40px; display: flex; align-items: center; justify-content: center;">
        <i data-lucide="chevron-right" style="width: 16px;"></i>
      </button>
    `;

    lucide.createIcons();
  },

  setSchedulePage(page) {
    this.scheduleState.currentPage = page;
    this.renderSchedules(false);
  },

  openAddScheduleModal() {
    const form = document.getElementById('addScheduleForm');
    if (form) form.reset();
    
    document.getElementById('scheduleId').value = '';
    document.getElementById('scheduleModalTitle').textContent = 'Buat Jadwal Baru';
    
    // Default date to today
    const dateInput = document.getElementById('scheduleDate');
    if (dateInput) dateInput.value = this.getLocalYMD(new Date());

    // Reset time group
    const timeGrp = document.getElementById('scheduleTimeGroup');
    if (timeGrp) timeGrp.style.display = 'none';
    const timeInput = document.getElementById('scheduleTime');
    if (timeInput) {
      timeInput.removeAttribute('required');
      timeInput.value = '';
    }
    
    this.openModal('addScheduleModal');
  },

  editSchedule(id) {
    const sch = this.data.schedules.find(s => s.id == id);
    if (!sch) return;
    
    const form = document.getElementById('addScheduleForm');
    if (form) form.reset();
    
    document.getElementById('scheduleId').value = sch.id;
    document.getElementById('scheduleModalTitle').textContent = 'Edit Jadwal';
    
    const type = sch.type || 'Booking';
    document.getElementById('scheduleType').value = type;
    document.getElementById('scheduleTitle').value = sch.title || '';
    
    // Extract date and time
    let timeVal = '';
    let dateVal = '';
    if (sch.date) {
      if (sch.date.includes('T')) {
        dateVal = sch.date.split('T')[0];
        const timePart = sch.date.split('T')[1];
        if (timePart && timePart.includes(':')) {
          const parts = timePart.split(':');
          timeVal = `${parts[0]}:${parts[1]}`; // "HH:MM"
        }
      } else {
        dateVal = this.getLocalYMD(sch.date);
      }
    }
    document.getElementById('scheduleDate').value = dateVal;
    
    const timeGrp = document.getElementById('scheduleTimeGroup');
    const timeInput = document.getElementById('scheduleTime');
    if (type === 'Meeting') {
      if (timeGrp) timeGrp.style.display = 'block';
      if (timeInput) {
        timeInput.setAttribute('required', 'required');
        timeInput.value = timeVal;
      }
    } else {
      if (timeGrp) timeGrp.style.display = 'none';
      if (timeInput) {
        timeInput.removeAttribute('required');
        timeInput.value = '';
      }
    }

    document.getElementById('scheduleLocation').value = sch.location || '';
    document.getElementById('scheduleNotes').value = sch.notes || '';
    
    this.openModal('addScheduleModal');
  },

  async deleteSchedule(id) {
    if (await this.showConfirm("Hapus jadwal ini? Jadwal juga akan dihapus dari Google Calendar.", "Hapus Jadwal")) {
      this.showLoading(true, "Menghapus jadwal...");
      try {
        await this.deleteRow('Schedules', id);
        this.renderSchedules(true);
        this.showAlert("Jadwal berhasil dihapus!", "success");
      } catch (err) {
        this.showAlert("Gagal menghapus jadwal.", "error");
      } finally {
        this.showLoading(false);
      }
    }
  },

  async saveSchedule(e, statusOverride = null) {
    if (e) e.preventDefault();
    const id = document.getElementById('scheduleId').value;
    const type = document.getElementById('scheduleType').value;
    const title = document.getElementById('scheduleTitle').value;
    const dateInputVal = document.getElementById('scheduleDate').value;
    const location = document.getElementById('scheduleLocation').value;
    const notes = document.getElementById('scheduleNotes').value;

    let finalDate = dateInputVal;
    if (type === 'Meeting') {
      const timeInputVal = document.getElementById('scheduleTime').value;
      if (timeInputVal) {
        finalDate = `${dateInputVal}T${timeInputVal}:00+07:00`;
      }
    }

    let statusVal = 'Active';
    if (statusOverride) {
      statusVal = statusOverride;
    }

    this.showLoading(true, "Menyimpan Jadwal...");
    try {
      if (id) {
        const existing = this.data.schedules.find(s => s.id == id);
        const payload = {
          ...existing,
          type: type,
          title: title,
          date: finalDate,
          location: location,
          notes: notes,
          status: statusOverride ? statusOverride : (existing.status || 'Active')
        };
        await this.updateRow('Schedules', payload);
        this.showAlert("Jadwal berhasil diperbarui!", "success");
      } else {
        const newSchedule = {
          id: Date.now().toString(),
          type: type,
          title: title,
          date: finalDate,
          location: location,
          notes: notes,
          status: statusVal,
          createdat: new Date().toISOString()
        };
        await this.addRow('Schedules', newSchedule);
        this.showAlert("Jadwal baru berhasil dibuat!", "success");
      }
      this.closeModal('addScheduleModal');
      this.renderSchedules(true);
    } catch (err) {
      console.error(err);
      this.showAlert("Gagal menyimpan jadwal.", "error");
    } finally {
      this.showLoading(false);
    }
  },

  // === Feature: Users ===
  renderUsers() {
    const container = document.getElementById('usersTable');
    if (!container) return;
    container.innerHTML = '';

    if (this.data.users.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 3rem 1rem; color: var(--color-text-muted);">
          <i data-lucide="users" style="width:40px; height:40px; margin-bottom:12px; opacity:0.4;"></i>
          <p style="font-size:13px;">Belum ada user terdaftar.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    this.data.users.forEach((u, idx) => {
      const isSuperAdmin = u.role === 'super admin';
      const isAdmin = u.role === 'admin';
      const avatarIcon = isSuperAdmin ? 'shield-alert' : (isAdmin ? 'shield-check' : 'user');
      const displayName = u.name || u.username;
      
      let roleBadge = `<span class="user-role-badge user-role-user">User</span>`;
      let avatarClass = 'user-card-avatar--user';
      if (isSuperAdmin) {
        roleBadge = `<span class="user-role-badge user-role-super-admin">Super Admin</span>`;
        avatarClass = 'user-card-avatar--admin';
      } else if (isAdmin) {
        roleBadge = `<span class="user-role-badge user-role-admin">Admin</span>`;
        avatarClass = 'user-card-avatar--admin';
      }
      const isLast = idx === this.data.users.length - 1;

      const statusBadge = u.status === 'Pending' ? ` <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 6px; vertical-align: middle;">PENDING</span>` : '';

      container.innerHTML += `
        <div class="user-card-item${isLast ? ' user-card-last' : ''}">
          <div class="user-card-avatar ${avatarClass}">
            <i data-lucide="${avatarIcon}" style="width:17px; height:17px; pointer-events:none;"></i>
          </div>
          <div class="user-card-info">
            <span class="user-card-name">${this.escapeHTML(displayName)}${statusBadge}</span>
            <span class="user-card-sub">@${this.escapeHTML(u.username)}</span>
          </div>
          ${roleBadge}
          <div class="user-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="app.editUser('${u.id}')" title="Edit User">
              <i data-lucide="edit-2" style="width:14px; height:14px;"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="app.deleteUser('${u.id}')" title="Hapus User">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </div>
      `;
    });

    lucide.createIcons();
  },

  openAddUserModal() {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    // Reset password field ke type password + ikon eye awal
    const pwdInput = document.getElementById('userPassword');
    if (pwdInput) pwdInput.type = 'password';
    const toggleBtn = document.querySelector('#userModal .password-toggle-btn');
    if (toggleBtn) {
      toggleBtn.innerHTML = '<i data-lucide="eye" style="width:16px; height:16px;"></i>';
      lucide.createIcons({ nodes: [toggleBtn] });
    }
    this.openModal('userModal');
  },

  editUser(id) {
    const u = this.data.users.find(x => x.id == id);
    if(u) {
      document.getElementById('userId').value = u.id;
      // Isi nama lengkap
      const nameEl = document.getElementById('userFullName');
      if (nameEl) nameEl.value = u.name || '';
      document.getElementById('userName').value = u.username;
      // Kosongkan password — jangan tampilkan hash. Biarkan kosong = tidak ubah password.
      const pwdInput = document.getElementById('userPassword');
      if (pwdInput) {
        pwdInput.value = '';
        pwdInput.type = 'password';
        pwdInput.placeholder = 'Kosongkan jika tidak ingin ubah password';
        pwdInput.removeAttribute('required');
      }
      // Reset ikon eye ke kondisi awal
      const toggleBtn = document.querySelector('#userModal .password-toggle-btn');
      if (toggleBtn) {
        toggleBtn.innerHTML = '<i data-lucide="eye" style="width:16px; height:16px;"></i>';
        lucide.createIcons({ nodes: [toggleBtn] });
      }
      document.getElementById('userRole').value = u.role;
      this.openModal('userModal');
    }
  },

  async deleteUser(id) {
    if(await this.showConfirm("Hapus user ini?", "Hapus User")) {
      await this.deleteRow('Users', id);
      this.renderUsers();
    }
  },

  async saveUser(e, statusOverride = null) {
    if (e) e.preventDefault();
    const id = document.getElementById('userId').value;
    const username = document.getElementById('userName').value.trim();
    
    const existing = this.data.users.find(u => String(u.username).toLowerCase() === username.toLowerCase() && u.id != id);
    if (existing) {
      this.showAlert(`Username "${username}" sudah digunakan! Silakan pilih username lain.`, "warning");
      return;
    }
    
    const passwordInput = document.getElementById('userPassword').value.trim();
    let passwordVal = '';

    if (passwordInput === '' && id) {
      // Mode edit: password dikosongkan → pertahankan password lama
      const existingUser = this.data.users.find(u => u.id == id);
      passwordVal = existingUser ? (existingUser.password || '') : '';
    } else if (passwordInput !== '') {
      // Password baru diisi → hash
      passwordVal = await this.hashPassword(passwordInput);
    }

    const fullName = (document.getElementById('userFullName')?.value || '').trim();

    const payload = {
      id: id || Date.now().toString(),
      name: fullName || username,
      username: username,
      password: passwordVal,
      role: document.getElementById('userRole').value,
      status: statusOverride ? statusOverride : 'Active'
    };
    
    if(id) {
      await this.updateRow('Users', payload);
    } else {
      await this.addRow('Users', payload);
    }
    
    // Reset field password ke required & placeholder normal
    const pwdInput = document.getElementById('userPassword');
    if (pwdInput) {
      pwdInput.setAttribute('required', '');
      pwdInput.placeholder = '';
    }

    this.closeModal('userModal');
    this.renderUsers();
    document.getElementById('userForm').reset();
  },

  openProfileModal() {
    if (!this.data.currentUser) return;
    
    const user = this.data.users.find(u => u.username === this.data.currentUser.username) || this.data.currentUser;
    
    document.getElementById('profileName').value = user.name || user.username;
    document.getElementById('profileUsername').value = user.username || '';
    document.getElementById('profilePassword').value = user.password || '';
    
    this.openModal('profileModal');
  },

  async saveProfile(e, isDraft = false) {
    if (e) e.preventDefault();
    if (!this.data.currentUser) return;
    
    const name = document.getElementById('profileName').value.trim();
    const username = document.getElementById('profileUsername').value.trim();
    let password = document.getElementById('profilePassword').value.trim();
    
    if (!name || !username || !password) {
      this.showAlert("Semua field harus diisi!", "warning");
      return;
    }
    
    if (isDraft) {
      this.closeModal('profileModal');
      this.showAlert("Profil berhasil disimpan sebagai Draft!", "success");
      return;
    }
    
    const existing = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== this.data.currentUser.id);
    if (existing) {
      this.showAlert("Username sudah digunakan oleh akun lain. Silakan pilih username lain.", "warning");
      return;
    }
    
    this.showLoading(true, "Memperbarui data akun...");
    
    if (password === "********") {
      password = "";
    } else {
      password = await this.hashPassword(password);
    }

    const updatedUser = {
      ...this.data.currentUser,
      name: name,
      username: username,
      password: "********"
    };
    
    try {
      const index = this.data.users.findIndex(u => u.id == this.data.currentUser.id);
      let fullUserObj = index > -1 ? this.data.users[index] : { id: this.data.currentUser.id.toString(), role: this.data.currentUser.role };
      
      fullUserObj.name = name;
      fullUserObj.username = username;
      fullUserObj.password = password;
      
      if (this.data.apiUrl) {
        await this.updateRow('Users', fullUserObj);
      } else {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const idx = users.findIndex(u => u.id == fullUserObj.id);
        if (idx > -1) {
          users[idx] = fullUserObj;
        } else {
          users.push(fullUserObj);
        }
        localStorage.setItem('users', JSON.stringify(users));
        this.data.users = users;
      }
      
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      this.data.currentUser = updatedUser;
      
      this.applyRoles();
      
      this.closeModal('profileModal');
      this.showAlert("Data profil akun berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      this.showAlert("Gagal memperbarui data profil akun.", "error");
    } finally {
      this.showLoading(false);
    }
  },

  async logoutFromProfile() {
    this.closeModal('profileModal');
    await this.logout();
  },

  // === Feature: Reports ===
  // === Feature: Reports ===
  populateReportYearDropdown() {
    const yearSelect = document.getElementById('reportYearSelect');
    if (!yearSelect) return;
    
    const yearsSet = new Set();
    yearsSet.add(new Date().getFullYear()); // Always add current year
    
    this.data.invoices.forEach(inv => {
      if (inv.cateringDate) {
        const year = new Date(inv.cateringDate).getFullYear();
        if (!isNaN(year)) {
          yearsSet.add(year);
        }
      }
    });
    
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    
    yearSelect.innerHTML = '';
    sortedYears.forEach(y => {
      yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    });
    
    yearSelect.value = this.reportState.selectedYear;
  },

  toggleReportFilterInputs() {
    const typeSelect = document.getElementById('reportFilterType');
    if (!typeSelect) return;
    
    const filterType = typeSelect.value;
    this.reportState.filterType = filterType;
    
    const yearGroup = document.getElementById('reportYearInputGroup');
    const startDateGroup = document.getElementById('reportStartDateGroup');
    const endDateGroup = document.getElementById('reportEndDateGroup');
    
    if (filterType === 'year') {
      yearGroup.classList.remove('hidden');
      startDateGroup.classList.add('hidden');
      endDateGroup.classList.add('hidden');
    } else {
      yearGroup.classList.add('hidden');
      startDateGroup.classList.remove('hidden');
      endDateGroup.classList.remove('hidden');
    }
  },

  applyReportFilters(e) {
    if (e) e.preventDefault();
    
    const filterType = document.getElementById('reportFilterType').value;
    this.reportState.filterType = filterType;
    
    if (filterType === 'year') {
      this.reportState.selectedYear = parseInt(document.getElementById('reportYearSelect').value);
    } else {
      this.reportState.startDate = document.getElementById('reportStartDate').value;
      this.reportState.endDate = document.getElementById('reportEndDate').value;
      
      if (!this.reportState.startDate || !this.reportState.endDate) {
        this.showAlert("Harap tentukan tanggal mulai dan tanggal selesai.", "warning");
        return;
      }
      if (new Date(this.reportState.startDate) > new Date(this.reportState.endDate)) {
        this.showAlert("Tanggal mulai tidak boleh melebihi tanggal selesai.", "warning");
        return;
      }
    }
    
    this.renderReports();
  },

  resetReportFilters() {
    this.reportState.filterType = 'year';
    this.reportState.selectedYear = new Date().getFullYear();
    this.reportState.startDate = '';
    this.reportState.endDate = '';
    
    const typeSelect = document.getElementById('reportFilterType');
    if (typeSelect) typeSelect.value = 'year';
    
    const yearSelect = document.getElementById('reportYearSelect');
    if (yearSelect) yearSelect.value = this.reportState.selectedYear;
    
    const startInput = document.getElementById('reportStartDate');
    if (startInput) startInput.value = '';
    
    const endInput = document.getElementById('reportEndDate');
    if (endInput) endInput.value = '';
    
    this.toggleReportFilterInputs();
    this.renderReports();
  },



  animateValue(obj, start, end, duration, formatCurrency = false) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (end - start) * easeOutQuart);
      
      if (formatCurrency) {
        obj.textContent = this.formatCurrency(current).replace('Rp ', '');
      } else {
        obj.textContent = current;
      }
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        if (formatCurrency) {
          obj.textContent = this.formatCurrency(end).replace('Rp ', '');
        } else {
          obj.textContent = end;
        }
      }
    };
    window.requestAnimationFrame(step);
  },

  renderReports() {
    const filteredInvoices = this.data.invoices.filter(inv => {
      if (!inv.cateringDate) return false;
      const invDateStr = inv.cateringDate.substring(0, 10);
      
      if (this.reportState.filterType === 'year') {
        const year = parseInt(invDateStr.substring(0, 4));
        return year === this.reportState.selectedYear;
      } else {
        return invDateStr >= this.reportState.startDate && invDateStr <= this.reportState.endDate;
      }
    });

    const monthlyGroups = {};
    
    filteredInvoices.forEach(inv => {
      const monthStr = inv.cateringDate.substring(0, 7);
      if (!monthlyGroups[monthStr]) {
        monthlyGroups[monthStr] = {
          monthKey: monthStr,
          invoiceCount: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalRemaining: 0
        };
      }
      
      const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
      const remaining = Math.max(0, Number(inv.totalAmount) - paid);
      
      monthlyGroups[monthStr].invoiceCount += 1;
      monthlyGroups[monthStr].totalAmount += Number(inv.totalAmount);
      monthlyGroups[monthStr].totalPaid += paid;
      monthlyGroups[monthStr].totalRemaining += remaining;
    });

    const sortedMonths = Object.keys(monthlyGroups).sort();

    const tbody = document.getElementById('reportTableBody');
    const totalRow = document.getElementById('reportTableTotalRow');
    if (tbody) {
      tbody.innerHTML = '';
      
      let grandTotalCount = 0;
      let grandTotalAmount = 0;
      let grandTotalPaid = 0;
      let grandTotalRemaining = 0;
      
      if (sortedMonths.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
              Tidak ada data transaksi untuk filter terpilih.
            </td>
          </tr>
        `;
      } else {
        sortedMonths.forEach(mKey => {
          const group = monthlyGroups[mKey];
          grandTotalCount += group.invoiceCount;
          grandTotalAmount += group.totalAmount;
          grandTotalPaid += group.totalPaid;
          grandTotalRemaining += group.totalRemaining;
          
          const [year, month] = mKey.split('-');
          const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
          
          tbody.innerHTML += `
            <tr>
              <td><strong>${monthName}</strong></td>
              <td style="text-align: center;">${group.invoiceCount}</td>
              <td style="text-align: right;">${this.formatCurrency(group.totalAmount)}</td>
              <td style="text-align: right; color: var(--color-success); font-weight: 500;">${this.formatCurrency(group.totalPaid)}</td>
              <td style="text-align: right; color: ${group.totalRemaining > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'}; font-weight: 500;">
                ${this.formatCurrency(group.totalRemaining)}
              </td>
            </tr>
          `;
        });
      }
      
      if (totalRow) {
        totalRow.innerHTML = `
          <td>TOTAL KESELURUHAN</td>
          <td style="text-align: center;">${grandTotalCount}</td>
          <td style="text-align: right;">${this.formatCurrency(grandTotalAmount)}</td>
          <td style="text-align: right; color: var(--color-success);">${this.formatCurrency(grandTotalPaid)}</td>
          <td style="text-align: right; color: ${grandTotalRemaining > 0 ? 'var(--color-danger)' : 'inherit'};">${this.formatCurrency(grandTotalRemaining)}</td>
        `;
      }
      
      // Update Hero Section
      const heroRevenueAmount = document.getElementById('heroRevenueAmount');
      const heroTotalInvoices = document.getElementById('heroTotalInvoices');
      const heroAvgRevenue = document.getElementById('heroAvgRevenue');
      const heroRevenueTitle = document.getElementById('heroRevenueTitle');
      
      if (heroRevenueAmount) {
        if (this.reportState.filterType === 'year') {
          heroRevenueTitle.textContent = `Total Omset Tahun ${this.reportState.selectedYear}`;
        } else {
          heroRevenueTitle.textContent = `Total Omset (Filter Khusus)`;
        }
        
        this.animateValue(heroRevenueAmount, 0, grandTotalAmount, 1500, true);
        
        if (heroTotalInvoices) {
          this.animateValue(heroTotalInvoices, 0, grandTotalCount, 1500, false);
        }
        
        if (heroAvgRevenue) {
          const avg = sortedMonths.length > 0 ? Math.floor(grandTotalAmount / sortedMonths.length) : 0;
          const formattedAvgStr = this.formatCurrency(avg);
          heroAvgRevenue.innerHTML = `<span style="font-size: 14px; color: var(--color-success); margin-right: 4px;">Rp</span>${formattedAvgStr.replace('Rp ', '')}`;
        }
      }
      // === Render Client Rating ===
      const clientMap = {};
      filteredInvoices.forEach(inv => {
        const name = (inv.customerName || 'Customer Tidak Diketahui').trim();
        if (!clientMap[name]) {
          clientMap[name] = { name: name, eventCount: 0, totalAmount: 0, totalRemaining: 0 };
        }
        
        const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
        const remaining = Math.max(0, Number(inv.totalAmount) - paid);
        
        clientMap[name].eventCount += 1;
        clientMap[name].totalAmount += Number(inv.totalAmount);
        clientMap[name].totalRemaining += remaining;
      });
      
      const sortedClients = Object.values(clientMap).sort((a, b) => b.totalAmount - a.totalAmount);
      
      const clientTbody = document.getElementById('clientRatingTableBody');
      if (clientTbody) {
        clientTbody.innerHTML = '';
        if (sortedClients.length === 0) {
          clientTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--color-text-muted);">Belum ada data kustomer.</td></tr>`;
        } else {
          sortedClients.forEach((client, idx) => {
            let rankHtml = `<strong>${idx + 1}</strong>`;
            if (idx === 0) rankHtml = `<i data-lucide="award" style="color: #fbbf24; width: 20px;"></i>`;
            else if (idx === 1) rankHtml = `<i data-lucide="award" style="color: #94a3b8; width: 20px;"></i>`;
            else if (idx === 2) rankHtml = `<i data-lucide="award" style="color: #b45309; width: 20px;"></i>`;
            
            clientTbody.innerHTML += `
              <tr class="interactive-table-row">
                <td style="text-align: center;">${rankHtml}</td>
                <td><strong style="color: var(--color-primary)">${this.escapeHTML(client.name)}</strong></td>
                <td style="text-align: center;">${client.eventCount}</td>
                <td style="text-align: right; font-weight: bold;">${this.formatCurrency(client.totalAmount)}</td>
                <td style="text-align: right; color: ${client.totalRemaining > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'};">${this.formatCurrency(client.totalRemaining)}</td>
              </tr>
            `;
          });
        }
        lucide.createIcons();
      }
    }

    this.renderReportChart(monthlyGroups, sortedMonths);
    this.renderReportMap(filteredInvoices);
  },

  renderReportChart(monthlyGroups, sortedMonths) {
    const canvas = document.getElementById('reportChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (this.reportChartInstance) this.reportChartInstance.destroy();

    const isLightTheme = document.body.classList.contains('light-theme');
    const labelColor = isLightTheme ? '#5e6d82' : '#94a3b8';
    const gridColor = isLightTheme ? 'rgba(212, 175, 55, 0.08)' : 'rgba(255, 255, 255, 0.06)';

    if (!monthlyGroups || !sortedMonths) {
      monthlyGroups = {};
      this.data.invoices.forEach(inv => {
        if (!inv.cateringDate) return;
        const invDateStr = inv.cateringDate.substring(0, 10);
        
        let match = false;
        if (this.reportState.filterType === 'year') {
          const year = parseInt(invDateStr.substring(0, 4));
          match = year === this.reportState.selectedYear;
        } else {
          match = invDateStr >= this.reportState.startDate && invDateStr <= this.reportState.endDate;
        }
        
        if (match) {
          const monthStr = invDateStr.substring(0, 7);
          if (!monthlyGroups[monthStr]) {
            monthlyGroups[monthStr] = { totalAmount: 0, totalPaid: 0, totalRemaining: 0 };
          }
          const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
          const remaining = Math.max(0, Number(inv.totalAmount) - paid);
          
          monthlyGroups[monthStr].totalAmount += Number(inv.totalAmount);
          monthlyGroups[monthStr].totalPaid += paid;
          monthlyGroups[monthStr].totalRemaining += remaining;
        }
      });
       sortedMonths = Object.keys(monthlyGroups).sort();
    }

    let labels = [];
    let paidTotals = [];
    let unpaidTotals = [];

    if (this.reportState.filterType === 'year') {
      const year = this.reportState.selectedYear;
      const monthNamesID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthNamesEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels = (this.data.language === 'en') ? monthNamesEN : monthNamesID;
      
      for (let m = 1; m <= 12; m++) {
        const mKey = `${year}-${String(m).padStart(2, '0')}`;
        const group = monthlyGroups[mKey] || { totalPaid: 0, totalRemaining: 0 };
        paidTotals.push(group.totalPaid);
        unpaidTotals.push(group.totalRemaining);
      }
    } else {
      labels = sortedMonths.map(mKey => {
        const [year, month] = mKey.split('-');
        return new Date(year, parseInt(month) - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
      });
      paidTotals = sortedMonths.map(l => monthlyGroups[l].totalPaid || 0);
      unpaidTotals = sortedMonths.map(l => monthlyGroups[l].totalRemaining || 0);
    }

    // Create elegant gradients
    const gradientPaid = ctx.createLinearGradient(0, 0, 0, 240);
    gradientPaid.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    gradientPaid.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

    const gradientUnpaid = ctx.createLinearGradient(0, 0, 0, 240);
    gradientUnpaid.addColorStop(0, 'rgba(212, 175, 55, 0.25)');
    gradientUnpaid.addColorStop(1, 'rgba(212, 175, 55, 0.00)');

    this.reportChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: (this.data.language === 'en') ? 'Terbayar (Paid)' : 'Terbayar (Lunas)',
            data: paidTotals,
            borderColor: '#10b981',
            backgroundColor: gradientPaid,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7
          },
          {
            label: (this.data.language === 'en') ? 'Piutang (Receivable)' : 'Piutang (Sisa)',
            data: unpaidTotals,
            borderColor: '#d4af37',
            backgroundColor: gradientUnpaid,
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#d4af37',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: labelColor,
              boxWidth: 12,
              font: { family: 'Inter, sans-serif', size: 12, weight: '500' },
              padding: 15
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 17, 21, 0.95)',
            titleColor: isLightTheme ? '#1e293b' : '#ffffff',
            bodyColor: isLightTheme ? '#5e6d82' : '#94a3b8',
            borderColor: 'rgba(212, 175, 55, 0.25)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: 'Inter, sans-serif', size: 12, weight: '700' },
            bodyFont: { family: 'Inter, sans-serif', size: 12 },
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true, 
            grid: { 
              color: gridColor,
              drawBorder: false,
              borderDash: [5, 5]
            }, 
            ticks: { 
              color: labelColor,
              font: { family: 'Inter, sans-serif', size: 11 },
              callback: function(value) {
                if (value >= 1000000) return (value / 1000000) + ' jt';
                if (value >= 1000) return (value / 1000) + ' rb';
                return value;
              }
            } 
          },
          x: { 
            grid: { display: false }, 
            ticks: { 
              color: labelColor,
              font: { family: 'Inter, sans-serif', size: 11 }
            } 
          }
        }
      }
    });
  },

  async getCityCoordinates(cityName) {
    const cleanName = cityName.trim();
    const cacheKey = `geo_cache_${cleanName.toLowerCase()}`;
    
    // Check local storage cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch(e) {}
    }

    // Predefined coordinates for instant match (mostly East Java, Banten, and user requested cities)
    const STATIC_COORDS = {
      'surabaya': [-7.2575, 112.7521],
      'sidoarjo': [-7.4726, 112.7126],
      'gresik': [-7.1610, 112.6563],
      'mojokerto': [-7.4705, 112.4401],
      'malang': [-7.9839, 112.6214],
      'pasuruan': [-7.6453, 112.9075],
      'bangkalan': [-7.0455, 112.7485],
      'rangkasbitung': [-6.3533, 106.2486],
      'serang': [-6.1200, 106.1502],
      'pandeglang': [-6.3084, 106.1067],
      'cilegon': [-5.9961, 106.0270],
      'tangerang': [-6.1783, 106.6319],
      'tanggerang': [-6.1783, 106.6319]
    };

    const lowerName = cleanName.toLowerCase();
    if (STATIC_COORDS[lowerName]) {
      localStorage.setItem(cacheKey, JSON.stringify(STATIC_COORDS[lowerName]));
      return STATIC_COORDS[lowerName];
    }

    // Dynamic search via OSM Nominatim API
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(cleanName)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PoetrysCateringDashboard/1.0' }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        localStorage.setItem(cacheKey, JSON.stringify(coords));
        return coords;
      }
    } catch (err) {
      console.warn("Geocoding failed for city:", cleanName, err);
    }

    // Default fallback coordinate (Surabaya centered)
    return [-7.2575, 112.7521];
  },

  reportMapInstance: null,

  async renderReportMap(filteredInvoices) {
    const mapDiv = document.getElementById('reportMap');
    if (!mapDiv) return;

    // 1. Initial coordinates for standard Banten list
    const DEFAULT_COORDS = {
      'Serang': [-6.1200, 106.1502],
      'Tangerang': [-6.1783, 106.6319],
      'Tangerang Selatan': [-6.2886, 106.7179],
      'Cilegon': [-5.9961, 106.0270],
      'Pandeglang': [-6.3084, 106.1067],
      'Rangkasbitung': [-6.3533, 106.2486],
      'Lebak': [-6.3533, 106.2486]
    };

    // 2. Aggregate filtered invoices by city name
    const cityData = {};

    filteredInvoices.forEach(inv => {
      let rawCity = (inv.cateringCity || inv.CateringCity || 'Serang').trim();
      if (!rawCity) rawCity = 'Serang';
      
      // Capitalize first letter of each word
      const formattedCity = rawCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

      if (!cityData[formattedCity]) {
        cityData[formattedCity] = { name: formattedCity, totalAmount: 0, totalPaid: 0, totalRemaining: 0, eventCount: 0 };
      }
      
      const paid = Number(inv.paidAmount) || (inv.status === 'Paid' || inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
      const remaining = Math.max(0, Number(inv.totalAmount) - paid);

      cityData[formattedCity].totalAmount += Number(inv.totalAmount);
      cityData[formattedCity].totalPaid += paid;
      cityData[formattedCity].totalRemaining += remaining;
      cityData[formattedCity].eventCount += 1;
    });

    // 3. Setup Leaflet Map Instance
    if (this.reportMapInstance) {
      this.reportMapInstance.remove();
      this.reportMapInstance = null;
    }

    // Determine initial center dynamically based on aggregated data
    let initialCenter = [-6.1200, 106.1502]; // Serang fallback
    const activeCityNames = Object.keys(cityData);
    if (activeCityNames.length > 0) {
      const firstCity = activeCityNames[0];
      const coords = await this.getCityCoordinates(firstCity);
      if (coords) {
        initialCenter = coords;
      }
    }

    this.reportMapInstance = L.map('reportMap', {
      center: initialCenter,
      zoom: 10,
      zoomControl: true
    });

    // 4. Map Theme Tiles
    const isLightTheme = document.body.classList.contains('light-theme');
    let tileUrl = '';
    let tileAttribution = '';
    
    if (isLightTheme) {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    } else {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }

    L.tileLayer(tileUrl, {
      attribution: tileAttribution,
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.reportMapInstance);

    // 5. Draw Proportional Circles
    let maxTurnover = 0;
    Object.values(cityData).forEach(c => {
      if (c.totalAmount > maxTurnover) maxTurnover = c.totalAmount;
    });

    const activeBounds = [];

    for (const c of Object.values(cityData)) {
      const coords = await this.getCityCoordinates(c.name);
      if (!coords) continue;

      const hasEvents = c.eventCount > 0;
      if (hasEvents) {
        activeBounds.push(coords);
      }

      let radius = 2500; 
      if (maxTurnover > 0 && c.totalAmount > 0) {
        radius += (c.totalAmount / maxTurnover) * 12000;
      }

      const color = hasEvents ? '#d4af37' : 'rgba(148, 163, 184, 0.3)';
      const fillColor = hasEvents ? '#d4af37' : 'rgba(148, 163, 184, 0.3)';
      const fillOpacity = hasEvents ? 0.35 : 0.05;
      const weight = hasEvents ? 2 : 1;

      const circle = L.circle(coords, {
        color: color,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
        weight: weight,
        radius: radius,
        interactive: true
      }).addTo(this.reportMapInstance);

      let tooltipContent = `
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; color: ${isLightTheme ? '#1e293b' : '#ffffff'}; line-height: 1.5; pointer-events: none;">
          <div style="font-weight: 700; border-bottom: 1px solid rgba(212,175,55,0.25); padding-bottom: 4px; margin-bottom: 6px; font-size: 13px; color: var(--color-primary);">
            Kota ${c.name}
          </div>
          <div style="margin-bottom: 3px;">
            <strong>Jumlah Event:</strong> ${c.eventCount} Katering
          </div>
          <div style="margin-bottom: 3px;">
            <strong>Total Omset:</strong> <span style="font-weight: 700; color: #10b981;">${this.formatCurrency(c.totalAmount)}</span>
          </div>
          <div style="margin-bottom: 3px;">
            <strong>Terbayar (Lunas):</strong> ${this.formatCurrency(c.totalPaid)}
          </div>
          <div style="margin-bottom: 1px;">
            <strong>Sisa Piutang:</strong> <span style="font-weight: 700; color: ${c.totalRemaining > 0 ? 'var(--color-danger)' : '#10b981'};">${this.formatCurrency(c.totalRemaining)}</span>
          </div>
        </div>
      `;

      circle.bindTooltip(tooltipContent, {
        permanent: false,
        sticky: true,
        direction: 'auto',
        opacity: 0.98,
        className: 'custom-gis-tooltip'
      });
      
      circle.on('mouseover', function (e) {
        this.setStyle({
          fillOpacity: 0.65,
          weight: 3,
          color: '#ffffff'
        });
      });

      circle.on('mouseout', function (e) {
        this.setStyle({
          fillOpacity: fillOpacity,
          weight: weight,
          color: color
        });
      });
    }

    // Fit map bounds dynamically to show active event locations
    if (activeBounds.length > 0) {
      try {
        const bounds = L.latLngBounds(activeBounds);
        this.reportMapInstance.fitBounds(bounds, { padding: [40, 40] });
      } catch(e) {}
    }
  },

  exportReportToExcel() {
    this.showLoading(true, "Mengekspor laporan ke Excel...");
    try {
      const filteredInvoices = this.data.invoices.filter(inv => {
        if (!inv.cateringDate) return false;
        const invDateStr = inv.cateringDate.substring(0, 10);
        
        if (this.reportState.filterType === 'year') {
          const year = parseInt(invDateStr.substring(0, 4));
          return year === this.reportState.selectedYear;
        } else {
          return invDateStr >= this.reportState.startDate && invDateStr <= this.reportState.endDate;
        }
      });

      const monthlyGroups = {};
      
      filteredInvoices.forEach(inv => {
        const monthStr = inv.cateringDate.substring(0, 7);
        if (!monthlyGroups[monthStr]) {
          monthlyGroups[monthStr] = {
            monthKey: monthStr,
            invoiceCount: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalRemaining: 0
          };
        }
        
        const paid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
        const remaining = Math.max(0, Number(inv.totalAmount) - paid);
        
        monthlyGroups[monthStr].invoiceCount += 1;
        monthlyGroups[monthStr].totalAmount += Number(inv.totalAmount);
        monthlyGroups[monthStr].totalPaid += paid;
        monthlyGroups[monthStr].totalRemaining += remaining;
      });

      const sortedMonths = Object.keys(monthlyGroups).sort();
      
      if (sortedMonths.length === 0) {
        this.showAlert("Tidak ada data transaksi untuk diekspor pada filter terpilih.", "warning");
        this.showLoading(false);
        return;
      }

      let filterDesc = '';
      if (this.reportState.filterType === 'year') {
        filterDesc = `Tahun ${this.reportState.selectedYear}`;
      } else {
        filterDesc = `Periode ${this.formatDate(this.reportState.startDate)} sd ${this.formatDate(this.reportState.endDate)}`;
      }

      const dataRows = [];
      dataRows.push(["POETRY'S CATERING - LAPORAN PENDAPATAN BULANAN"]);
      dataRows.push([`Filter Parameter: ${filterDesc}`]);
      dataRows.push([`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`]);
      dataRows.push([]); // Spacer row

      // Headers
      dataRows.push(["Bulan", "Jumlah Invoice", "Total Tagihan (Rp)", "Total Terbayar (Rp)", "Sisa Tagihan (Rp)"]);

      let grandTotalCount = 0;
      let grandTotalAmount = 0;
      let grandTotalPaid = 0;
      let grandTotalRemaining = 0;

      sortedMonths.forEach(mKey => {
        const group = monthlyGroups[mKey];
        grandTotalCount += group.invoiceCount;
        grandTotalAmount += group.totalAmount;
        grandTotalPaid += group.totalPaid;
        grandTotalRemaining += group.totalRemaining;
        
        const [year, month] = mKey.split('-');
        const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        
        dataRows.push([
          monthName,
          group.invoiceCount,
          group.totalAmount,
          group.totalPaid,
          group.totalRemaining
        ]);
      });

      // Total row
      dataRows.push([
        "TOTAL KESELURUHAN",
        grandTotalCount,
        grandTotalAmount,
        grandTotalPaid,
        grandTotalRemaining
      ]);

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      
      // Auto-width adjustment for columns
      const colWidths = [
        { wch: 25 }, // Bulan
        { wch: 15 }, // Jumlah Invoice
        { wch: 20 }, // Total Tagihan
        { wch: 20 }, // Total Terbayar
        { wch: 20 }  // Sisa Tagihan
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Pendapatan");

      const safeFilterDesc = filterDesc.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Laporan_Pendapatan_${safeFilterDesc}.xlsx`;
      XLSX.writeFile(wb, filename);

      this.showAlert("Laporan Pendapatan berhasil diekspor ke Excel!", "success");
    } catch (err) {
      console.error(err);
      this.showAlert("Gagal mengekspor laporan ke Excel.", "error");
    } finally {
      this.showLoading(false);
    }
  },

  // === Settings ===
  saveSettings() {
    let url = document.getElementById('settingApiUrl').value.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    localStorage.setItem('apiUrl', url);
    this.data.apiUrl = url;
    const paymentAccounts = document.getElementById('settingPaymentAccounts').value;
    localStorage.setItem('paymentAccounts', paymentAccounts);
    
    this.showAlert("Pengaturan disimpan! Memuat ulang data...", "success");
    this.loadData();
  },

  // === Utils ===
  formatPhone(phone) {
    if (!phone) return '-';
    let str = phone.toString().trim();
    if (str.startsWith('8')) return '0' + str;
    return str;
  },

  formatPhoneForWA(phone) {
    if (!phone) return '';
    let clean = phone.toString().replace(/\D/g, ''); // Keep only digits
    if (clean.startsWith('08')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    } else if (clean.startsWith('6208')) {
      clean = '628' + clean.slice(4);
    }
    return clean;
  },

  getLocalYMD(val) {
    if (!val) return '';
    if (typeof val === 'string' && val.length === 10 && val.includes('-')) return val;
    if (typeof val === 'string' && val.includes('T')) {
      return val.split('T')[0];
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(d);
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      return `${y}-${m}-${day}`;
    } catch(e) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    try {
      return d.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch(e) {
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  },

  formatCurrency(num) {
    return 'Rp ' + Number(num).toLocaleString('id-ID');
  },

  openModal(id) {
    document.getElementById(id).classList.remove('hidden');
  },
  
  closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  },

  showAlert(message, type = 'info', title = 'Pemberitahuan') {
    return new Promise((resolve) => {
      const modal = document.getElementById('customAlertModal');
      const titleEl = document.getElementById('customAlertTitle');
      const msgEl = document.getElementById('customAlertMessage');
      const iconContainer = document.getElementById('customAlertIconContainer');
      const okBtn = document.getElementById('btnCustomAlertOk');
      const cancelBtn = document.getElementById('btnCustomAlertCancel');
      
      if (!modal || !msgEl) {
        alert(message);
        resolve(true);
        return;
      }
      
      titleEl.textContent = title;
      msgEl.textContent = message;
      cancelBtn.classList.add('hidden');
      
      let iconHtml = '';
      if (type === 'success') {
        iconHtml = `<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: var(--color-success); display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="check-circle-2" style="width: 36px; height: 36px;"></i></div>`;
      } else if (type === 'error') {
        iconHtml = `<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: var(--color-danger); display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="alert-triangle" style="width: 36px; height: 36px;"></i></div>`;
      } else if (type === 'warning') {
        iconHtml = `<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #f59e0b; display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="alert-circle" style="width: 36px; height: 36px;"></i></div>`;
      } else {
        iconHtml = `<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(212, 175, 55, 0.1); color: var(--color-primary); display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="info" style="width: 36px; height: 36px;"></i></div>`;
      }
      iconContainer.innerHTML = iconHtml;
      lucide.createIcons();
      
      const onOk = () => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        resolve(true);
      };
      
      okBtn.addEventListener('click', onOk);
      modal.classList.remove('hidden');
    });
  },

  showConfirm(message, title = 'Konfirmasi') {
    return new Promise((resolve) => {
      const modal = document.getElementById('customAlertModal');
      const titleEl = document.getElementById('customAlertTitle');
      const msgEl = document.getElementById('customAlertMessage');
      const iconContainer = document.getElementById('customAlertIconContainer');
      const okBtn = document.getElementById('btnCustomAlertOk');
      const cancelBtn = document.getElementById('btnCustomAlertCancel');
      
      if (!modal || !msgEl) {
        const result = confirm(message);
        resolve(result);
        return;
      }
      
      titleEl.textContent = title;
      msgEl.textContent = message;
      cancelBtn.classList.remove('hidden');
      
      iconContainer.innerHTML = `<div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #f59e0b; display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="help-circle" style="width: 36px; height: 36px;"></i></div>`;
      lucide.createIcons();
      
      const onOk = () => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(true);
      };
      
      const onCancel = () => {
        modal.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(false);
      };
      
      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.classList.remove('hidden');
    });
  },

  setLanguage(lang) {
    localStorage.setItem('appLanguage', lang);
    this.data.language = lang;
    
    // Toggle active flag styles
    const btnID = document.getElementById('btnLangID');
    const btnEN = document.getElementById('btnLangEN');
    if (btnID && btnEN) {
      if (lang === 'id') {
        btnID.classList.add('active');
        btnEN.classList.remove('active');
      } else {
        btnEN.classList.add('active');
        btnID.classList.remove('active');
      }
    }
    
    // Perform element translation
    document.querySelectorAll('[data-lang-key]').forEach(el => {
      const key = el.getAttribute('data-lang-key');
      const translation = this.translations[lang][key];
      if (translation) {
        // If element has dynamic icon, preserve it
        const icon = el.querySelector('i, svg');
        if (icon) {
          el.innerHTML = '';
          el.appendChild(icon);
          el.appendChild(document.createTextNode(' ' + translation));
        } else {
          el.textContent = translation;
        }
      }
    });

    // Also update schedules calendar search placeholder
    const searchInput = document.getElementById('scheduleSearchName');
    if (searchInput) {
      if (lang === 'id') {
        searchInput.placeholder = "Cari nama customer...";
      } else {
        searchInput.placeholder = "Search customer name...";
      }
    }

    // Update invoice search placeholder
    const invoiceSearch = document.getElementById('invoiceSearchText');
    if (invoiceSearch) {
      if (lang === 'id') {
        invoiceSearch.placeholder = "Cari nama pelanggan atau nomor invoice...";
      } else {
        invoiceSearch.placeholder = "Search customer name or invoice number...";
      }
    }

    // Update menu search placeholder
    const menuSearch = document.getElementById('menuSearchText');
    if (menuSearch) {
      if (lang === 'id') {
        menuSearch.placeholder = "Cari nama menu atau deskripsi...";
      } else {
        menuSearch.placeholder = "Search menu name or description...";
      }
    }
  },

  importInvoicesFromExcel(e) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin' && role !== 'super admin') {
      this.showAlert("Anda tidak memiliki izin untuk mengimpor invoice.", "error", "Akses Ditolak");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    this.showLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawRows.length < 2) {
          throw new Error(this.data.language === 'en' ? "Excel file is empty or missing headers." : "File Excel kosong atau tidak memiliki tajuk/header.");
        }

        // Parse headers
        const headers = rawRows[0].map(h => String(h).trim().toLowerCase());
        
        // Find column indices
        const getColIndex = (names) => {
          return headers.findIndex(h => names.some(name => h.includes(name)));
        };

        const idxInvNum = getColIndex(['invoice', 'no', 'faktur']);
        const idxCustName = getColIndex(['customer', 'pelanggan', 'nama']);
        const idxPhone = getColIndex(['phone', 'telepon', 'hp']);
        const idxLoc = getColIndex(['location', 'lokasi', 'alamat']);
        const idxDate = getColIndex(['date', 'tanggal']);
        const idxTotal = getColIndex(['total', 'amount', 'tagihan', 'harga']);
        const idxPaid = getColIndex(['paid', 'dp', 'dibayar', 'uang muka']);
        const idxStatus = getColIndex(['status']);

        if (idxCustName === -1 || idxLoc === -1 || idxDate === -1 || idxTotal === -1) {
          throw new Error(this.data.language === 'en' 
            ? "Excel must contain at least: Customer Name, Location, Date, and Total Amount columns." 
            : "Excel harus berisi minimal kolom: Nama Pelanggan, Lokasi, Tanggal, dan Total Tagihan.");
        }

        const newInvoices = [];
        let successCount = 0;

        // Start from row 1 (skipping header)
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || !row[idxCustName]) continue; // Skip empty rows

          // Parse and format date
          let dateStr = '';
          const rawDate = row[idxDate];
          if (rawDate) {
            if (typeof rawDate === 'number') {
              // Convert serial number of excel date
              const parsedDate = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
              dateStr = app.getLocalYMD(parsedDate);
            } else {
              const cleanDateStr = String(rawDate).trim();
              // Try formatting
              const dateMatch = cleanDateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
              if (dateMatch) {
                dateStr = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
              } else {
                // Try DD/MM/YYYY
                const dateMatchDMY = cleanDateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
                if (dateMatchDMY) {
                  dateStr = `${dateMatchDMY[3]}-${dateMatchDMY[2].padStart(2, '0')}-${dateMatchDMY[1].padStart(2, '0')}`;
                } else {
                  dateStr = cleanDateStr;
                }
              }
            }
          }

          if (!dateStr || dateStr === 'NaN-NaN-NaN') {
            dateStr = app.getLocalYMD(new Date());
          }

          const customerName = String(row[idxCustName]).trim();
          const customerPhone = idxPhone !== -1 && row[idxPhone] ? String(row[idxPhone]).trim() : '';
          const cateringLocation = String(row[idxLoc]).trim();
          const totalAmount = idxTotal !== -1 && row[idxTotal] ? Number(row[idxTotal]) : 0;
          const paidAmount = idxPaid !== -1 && row[idxPaid] ? Number(row[idxPaid]) : 0;
          const remainingAmount = Math.max(0, totalAmount - paidAmount);
          
          let status = 'Unpaid';
          if (idxStatus !== -1 && row[idxStatus]) {
            const rawStatus = String(row[idxStatus]).toLowerCase();
            if (rawStatus.includes('lunas') || rawStatus.includes('paid')) {
              status = 'Paid';
            }
          } else {
            status = remainingAmount === 0 ? 'Paid' : 'Unpaid';
          }

          // Generate Invoice Number if missing
          let invoiceNumber = idxInvNum !== -1 && row[idxInvNum] ? String(row[idxInvNum]).trim() : '';
          if (!invoiceNumber) {
            const count = this.data.invoices.length + newInvoices.length + 1;
            invoiceNumber = `INV-${String(count).padStart(3, '0')}`;
          }

          // Default menu item representing the invoice total
          const items = [{
            name: "Layanan Katering (Excel Import)",
            price: totalAmount,
            qty: 1,
            subtotal: totalAmount
          }];

          const invoicePayload = {
            id: Date.now() + Math.random(),
            invoiceNumber,
            customerName,
            customerPhone,
            cateringLocation,
            cateringCity: "Serang",
            cateringDate: dateStr,
            items,
            totalAmount,
            paidAmount,
            remainingAmount,
            status,
            createdAt: new Date().toISOString()
          };

          // Save row
          await this.addRow('Invoices', invoicePayload);
          successCount++;
        }

        this.showAlert(
          this.data.language === 'en'
            ? `Successfully imported ${successCount} invoices!`
            : `Berhasil mengimpor ${successCount} data invoice!`,
          "success"
        );
        
        // Refresh and load
        await this.refreshData();

      } catch (err) {
        console.error(err);
        this.showAlert(
          this.data.language === 'en'
            ? `Failed to import Excel: ${err.message}`
            : `Gagal mengimpor Excel: ${err.message}`,
          "error"
        );
      } finally {
        e.target.value = '';
        this.showLoading(false);
      }
    };

    reader.onerror = () => {
      this.showAlert("Gagal membaca file.", "error");
      this.showLoading(false);
    };

    reader.readAsArrayBuffer(file);
  },

  handleMenuAutocomplete(inputEl, target) {
    const val = inputEl.value.toLowerCase().trim();
    const suggestionsId = target === 'create' ? 'invMenuSelectSuggestions' : 'editInvMenuSelectSuggestions';
    const container = document.getElementById(suggestionsId);
    if (!container) return;

    if (!val) {
      container.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    // Filter menu database
    const matches = this.data.menus.filter(m => 
      m.name.toLowerCase().includes(val)
    ).slice(0, 8); // Limit to 8 matches

    if (matches.length === 0) {
      container.innerHTML = `
        <div style="padding: 10px 14px; color: var(--color-text-muted); font-size: 0.88rem; font-style: italic;">
          Menu tidak ditemukan.
        </div>
      `;
      container.classList.remove('hidden');
      return;
    }

    container.innerHTML = matches.map(m => `
      <div class="autocomplete-suggestion-item" onclick="app.addMenuItemDirectly('${m.id}', '${target}')">
        <span class="autocomplete-suggestion-name">${this.escapeHTML(m.name)}</span>
        <span class="autocomplete-suggestion-price">${this.formatCurrency(m.price)}</span>
      </div>
    `).join('');
    
    container.classList.remove('hidden');
  },

  addMenuItemDirectly(menuId, target) {
    const menu = this.data.menus.find(m => m.id == menuId);
    if (!menu) return;

    const targetArray = target === 'create' ? this.currentInvoice.items : this.editInvoiceState.items;
    
    // Check if item already exists
    const existing = targetArray.find(item => item.menuId == menu.id);
    if (existing) {
      existing.qty += 1;
      existing.subtotal = existing.qty * existing.price;
    } else {
      targetArray.push({
        menuId: menu.id,
        name: menu.name,
        price: menu.price,
        qty: 1,
        unit: menu.unit || 'pax',
        subtotal: menu.price
      });
    }

    // Clear input field & hide suggestions
    const inputId = target === 'create' ? 'invMenuSelect' : 'editInvMenuSelect';
    const suggestionsId = target === 'create' ? 'invMenuSelectSuggestions' : 'editInvMenuSelectSuggestions';
    
    const inputEl = document.getElementById(inputId);
    if (inputEl) inputEl.value = '';
    
    const suggestionsEl = document.getElementById(suggestionsId);
    if (suggestionsEl) {
      suggestionsEl.classList.add('hidden');
      suggestionsEl.innerHTML = '';
    }

    // Refresh UI
    if (target === 'create') {
      this.updateInvoiceItemsTable();
      this.recalcCreateInvoiceTotals();
    } else {
      this.updateEditInvoiceItemsTable();
      this.recalcEditInvoiceTotals();
    }
  },

  openMenuSelection(target) {
    this.menuModalState.target = target;
    this.menuModalState.searchQuery = '';
    this.menuModalState.currentPage = 1;
    this.menuModalState.selectedItems = {};
    
    // Set title depending on target
    const modalTitle = document.getElementById('menuSelectionModalTitle');
    if (modalTitle) {
      modalTitle.textContent = target === 'create' ? 'Pilih Menu Catering (Invoice Baru)' : 'Pilih Menu Catering (Edit Invoice)';
    }

    // Pre-populate with currently active invoice items if any (so they are checked)
    const activeItems = target === 'create' ? this.currentInvoice.items : this.editInvoiceState.items;
    (activeItems || []).forEach(item => {
      this.menuModalState.selectedItems[item.menuId] = {
        qty: item.qty,
        checked: true
      };
    });

    const searchInput = document.getElementById('menuModalSearch');
    if (searchInput) searchInput.value = '';

    this.openModal('menuSelectionModal');
    this.renderMenuModalList();
    lucide.createIcons();
  },

  filterMenuModalList() {
    const searchInput = document.getElementById('menuModalSearch');
    this.menuModalState.searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    this.menuModalState.currentPage = 1;
    this.renderMenuModalList();
  },

  toggleMenuModalItem(menuId, checked) {
    if (!this.menuModalState.selectedItems[menuId]) {
      this.menuModalState.selectedItems[menuId] = { qty: 1, checked: false };
    }
    this.menuModalState.selectedItems[menuId].checked = checked;
    
    // Highlight row
    const row = document.getElementById(`menu-row-${menuId}`);
    const qtyInput = document.getElementById(`menu-qty-${menuId}`);
    if (checked) {
      if (row) row.classList.add('menu-checked-row');
      if (qtyInput) qtyInput.removeAttribute('disabled');
    } else {
      if (row) row.classList.remove('menu-checked-row');
      if (qtyInput) qtyInput.setAttribute('disabled', 'true');
    }
  },

  updateMenuModalItemQty(menuId, qty) {
    if (!this.menuModalState.selectedItems[menuId]) {
      this.menuModalState.selectedItems[menuId] = { qty: 1, checked: false };
    }
    this.menuModalState.selectedItems[menuId].qty = Math.max(1, parseInt(qty) || 1);
  },

  renderMenuModalList() {
    const tbody = document.getElementById('menuModalList');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = this.menuModalState.searchQuery;
    let filtered = this.data.menus.filter(m => {
      if (!query) return true;
      return String(m.name).toLowerCase().includes(query) || (m.description && String(m.description).toLowerCase().includes(query));
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / this.menuModalState.perPage) || 1;

    if (this.menuModalState.currentPage > totalPages) {
      this.menuModalState.currentPage = totalPages;
    }

    const startIndex = (this.menuModalState.currentPage - 1) * this.menuModalState.perPage;
    const endIndex = startIndex + this.menuModalState.perPage;
    const pageItems = filtered.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 30px; color: var(--color-text-muted);">
            Tidak ada menu yang cocok.
          </td>
        </tr>
      `;
    } else {
      pageItems.forEach(m => {
        const state = this.menuModalState.selectedItems[m.id] || { qty: 1, checked: false };
        const checkedAttr = state.checked ? 'checked' : '';
        const rowClass = state.checked ? 'class="menu-checked-row"' : '';

        tbody.innerHTML += `
          <tr id="menu-row-${m.id}" ${rowClass}>
            <td style="text-align: center; vertical-align: middle;">
              <input type="checkbox" id="menu-check-${m.id}" ${checkedAttr} onchange="app.toggleMenuModalItem('${m.id}', this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
            </td>
            <td style="vertical-align: middle;">
              <label for="menu-check-${m.id}" style="cursor: pointer; font-weight: 500; display: block; margin-bottom: 0;">${this.escapeHTML(m.name)}</label>
              ${m.description ? `<small style="display: block; color: var(--color-text-muted); font-size: 11px;">${this.escapeHTML(m.description)}</small>` : ''}
            </td>
            <td style="text-align: right; vertical-align: middle; font-weight: 600;">${this.formatCurrency(m.price)}</td>
            <td style="text-align: center; vertical-align: middle;"><span class="badge" style="background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px;">${this.escapeHTML(m.unit || 'pax')}</span></td>
          </tr>
        `;
      });
    }

    this.renderMenuModalPagination(totalPages, totalItems);
    lucide.createIcons();
  },

  renderMenuModalPagination(totalPages, totalItems) {
    const pagDiv = document.getElementById('menuModalPagination');
    if (!pagDiv) return;
    pagDiv.innerHTML = '';

    const startItem = (this.menuModalState.currentPage - 1) * this.menuModalState.perPage + 1;
    const endItem = Math.min(this.menuModalState.currentPage * this.menuModalState.perPage, totalItems);

    const infoText = `Menampilkan ${totalItems > 0 ? startItem : 0} sampai ${endItem} dari ${totalItems} menu`;

    const infoSpan = document.createElement('span');
    infoSpan.style.fontSize = '12px';
    infoSpan.style.color = 'var(--color-text-muted)';
    infoSpan.textContent = infoText;
    pagDiv.appendChild(infoSpan);

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '4px';

    // Prev
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-secondary btn-sm';
    prevBtn.style.padding = '4px 8px';
    prevBtn.disabled = this.menuModalState.currentPage === 1;
    prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width:14px; height:14px;"></i>';
    prevBtn.onclick = () => {
      if (this.menuModalState.currentPage > 1) {
        this.menuModalState.currentPage--;
        this.renderMenuModalList();
      }
    };
    btnGroup.appendChild(prevBtn);

    // Page Numbers
    const maxVisible = 5;
    let startPage = Math.max(1, this.menuModalState.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = i === this.menuModalState.currentPage ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      pageBtn.style.padding = '4px 10px';
      pageBtn.style.fontSize = '11px';
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        this.menuModalState.currentPage = i;
        this.renderMenuModalList();
      };
      btnGroup.appendChild(pageBtn);
    }

    // Next
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-secondary btn-sm';
    nextBtn.style.padding = '4px 8px';
    nextBtn.disabled = this.menuModalState.currentPage === totalPages;
    nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width:14px; height:14px;"></i>';
    nextBtn.onclick = () => {
      if (this.menuModalState.currentPage < totalPages) {
        this.menuModalState.currentPage++;
        this.renderMenuModalList();
      }
    };
    btnGroup.appendChild(nextBtn);

    pagDiv.appendChild(btnGroup);
  },

  confirmMenuSelection() {
    const selected = this.menuModalState.selectedItems;
    const target = this.menuModalState.target;
    
    // Clear the active array so we overwrite it with selected items
    let targetArray = [];
    
    // Find each checked menu item
    Object.keys(selected).forEach(menuId => {
      const itemState = selected[menuId];
      if (itemState.checked) {
        const menu = this.data.menus.find(m => m.id == menuId);
        if (menu) {
          targetArray.push({
            menuId: menu.id,
            name: menu.name,
            price: Number(menu.price) || 0,
            unit: menu.unit || 'pax',
            qty: Number(itemState.qty) || 1,
            subtotal: (Number(menu.price) || 0) * (Number(itemState.qty) || 1)
          });
        }
      }
    });

    if (target === 'create') {
      this.currentInvoice.items = targetArray;
      this.updateInvoiceItemsTable();
    } else {
      this.editInvoiceState.items = targetArray;
      this.updateEditInvoiceItemsTable();
    }

    this.closeModal('menuSelectionModal');
    this.showAlert("Menu katering berhasil ditambahkan ke invoice!", "success");
  },

  formatNumberToIndonesian(num) {
    if (isNaN(num) || num === null || num === undefined) return "";
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
  },

  parseIndonesianToNumber(str) {
    if (!str) return 0;
    const clean = str.toString().replace(/\D/g, "");
    return Number(clean) || 0;
  },

  setupCurrencyInputListeners() {
    const ids = ['invPaidAmount', 'editInvPaidAmount', 'invAdditionalFee', 'editInvAdditionalFee', 'invDiscountValue', 'editInvDiscountValue'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener('input', (e) => {
        if (e.target.id.includes('DiscountValue')) {
          const typeEl = document.getElementById(e.target.id.replace('Value', 'Type'));
          if (typeEl && typeEl.value === 'percent') {
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.id.startsWith('edit')) {
              this.recalcEditInvoiceTotals();
            } else {
              this.recalcCreateInvoiceTotals();
            }
            return;
          }
        }

        let val = e.target.value.replace(/\D/g, "");
        if (val) {
          const num = Number(val);
          e.target.value = this.formatNumberToIndonesian(num);
        } else {
          e.target.value = "0";
        }

        if (e.target.id.startsWith('edit')) {
          this.recalcEditInvoiceTotals();
        } else {
          this.recalcCreateInvoiceTotals();
        }
      });
    });
  },

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(e.currentTarget.dataset.page);
      });
    });

    window.addEventListener('resize', () => {
      const activeLink = document.querySelector('.nav-tab.active');
      if (activeLink) {
        this.updateNavIndicator(activeLink.dataset.page);
      }
    });

    // Login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('loginError').classList.add('hidden');
      this.login(
        document.getElementById('loginUsername').value,
        document.getElementById('loginPassword').value
      );
    });

    document.getElementById('btnLogout').addEventListener('click', () => this.logout());

    // Navbar User Profile click event
    const navbarUser = document.querySelector('.navbar-user');
    if (navbarUser) {
      navbarUser.addEventListener('click', () => this.openProfileModal());
    }

    // Notification Toggle
    const btnNotif = document.getElementById('btnNotificationToggle');
    const dropdownNotif = document.getElementById('notificationDropdown');
    if (btnNotif && dropdownNotif) {
      btnNotif.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownNotif.classList.toggle('active');
      });
      document.addEventListener('click', (e) => {
        if (!dropdownNotif.contains(e.target) && e.target !== btnNotif && !btnNotif.contains(e.target)) {
          dropdownNotif.classList.remove('active');
        }
        
        // Hide autocomplete suggestions on click outside
        const createSuggestions = document.getElementById('invMenuSelectSuggestions');
        if (createSuggestions && !createSuggestions.contains(e.target) && e.target.id !== 'invMenuSelect') {
          createSuggestions.classList.add('hidden');
        }
        const editSuggestions = document.getElementById('editInvMenuSelectSuggestions');
        if (editSuggestions && !editSuggestions.contains(e.target) && e.target.id !== 'editInvMenuSelect') {
          editSuggestions.classList.add('hidden');
        }
      });
    }

    // Settings
    document.getElementById('btnSaveSettings').addEventListener('click', () => this.saveSettings());

    // Forms
    document.getElementById('menuForm').addEventListener('submit', (e) => this.saveMenu(e));
    document.getElementById('userForm').addEventListener('submit', (e) => this.saveUser(e));
    
    // Invoice events
    
    // Create Invoice Discount listeners
    const invDiscountType = document.getElementById('invDiscountType');
    if (invDiscountType) {
      invDiscountType.addEventListener('change', () => {
        const valInput = document.getElementById('invDiscountValue');
        if (invDiscountType.value === 'none') {
          valInput.style.display = 'none';
          valInput.value = 0;
        } else {
          valInput.style.display = 'inline-block';
        }
        this.updateInvoiceItemsTable();
      });
    }
    const invDiscountValue = document.getElementById('invDiscountValue');
    if (invDiscountValue) {
      invDiscountValue.addEventListener('input', () => this.updateInvoiceItemsTable());
    }
    const invPaidInput = document.getElementById('invPaidAmount');
    if (invPaidInput) {
      invPaidInput.addEventListener('input', () => this.updateInvoiceItemsTable());
    }

    // Edit Invoice Discount listeners
    const editInvDiscountType = document.getElementById('editInvDiscountType');
    if (editInvDiscountType) {
      editInvDiscountType.addEventListener('change', () => {
        const valInput = document.getElementById('editInvDiscountValue');
        if (editInvDiscountType.value === 'none') {
          valInput.style.display = 'none';
          valInput.value = 0;
        } else {
          valInput.style.display = 'inline-block';
        }
        this.updateEditInvoiceItemsTable();
      });
    }
    const editInvDiscountValue = document.getElementById('editInvDiscountValue');
    if (editInvDiscountValue) {
      editInvDiscountValue.addEventListener('input', () => this.updateEditInvoiceItemsTable());
    }
    const editInvPaidInput = document.getElementById('editInvPaidAmount');
    if (editInvPaidInput) {
      editInvPaidInput.addEventListener('input', () => this.updateEditInvoiceItemsTable());
    }
    
    // Schedule events
    const addScheduleForm = document.getElementById('addScheduleForm');
    if (addScheduleForm) {
      addScheduleForm.addEventListener('submit', (e) => this.saveSchedule(e));
    }

    // Reports filter events
    const filterType = document.getElementById('reportFilterType');
    if (filterType) {
      filterType.addEventListener('change', () => this.toggleReportFilterInputs());
    }

    const filterForm = document.getElementById('reportFilterForm');
    if (filterForm) {
      filterForm.addEventListener('submit', (e) => this.applyReportFilters(e));
    }

    const btnResetFilters = document.getElementById('btnResetReportFilters');
    if (btnResetFilters) {
      btnResetFilters.addEventListener('click', () => this.resetReportFilters());
    }



    // Standalone Schedule Type change listener
    const schType = document.getElementById('scheduleType');
    if (schType) {
      schType.addEventListener('change', () => {
        const timeGrp = document.getElementById('scheduleTimeGroup');
        const timeInput = document.getElementById('scheduleTime');
        if (schType.value === 'Meeting') {
          timeGrp.style.display = 'block';
          timeInput.setAttribute('required', 'required');
        } else {
          timeGrp.style.display = 'none';
          timeInput.removeAttribute('required');
          timeInput.value = '';
        }
      });
    }

    // Dynamic nav indicator alignment on window resize
    window.addEventListener('resize', () => {
      const activeTab = document.querySelector('.nav-tab.active');
      if (activeTab && activeTab.dataset.page) {
        this.updateNavIndicator(activeTab.dataset.page);
      }
    });

    // Auto show date picker on click of date inputs
    document.addEventListener('click', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'date') {
        try {
          if (typeof e.target.showPicker === 'function') {
            e.target.showPicker();
          }
        } catch (err) {
          console.warn("showPicker is not supported or failed:", err);
        }
      }
    });

    // Setup currency listeners
    this.setupCurrencyInputListeners();
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

