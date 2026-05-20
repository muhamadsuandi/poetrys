// app.js
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

  translations: {
    id: {
      dashboard: "Dashboard",
      invoices: "Invoices",
      schedules: "Schedules",
      masterMenu: "Master Menu",
      masterUser: "Master User",
      reports: "Reports",
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
      revenueOverview: "Ikhtisar Pendapatan (7 Hari Terakhir)",
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
       revenueOverview: "Revenue Overview (Last 7 Days)",
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

  // Invoices Pagination, Search & Sorting States
  invoiceState: {
    currentPage: 1,
    perPage: 10,
    searchQuery: ''
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

  chartInstance: null,

  init() {
    // Gunakan URL default jika belum ada URL yang disimpan di browser ini
    if (!this.data.apiUrl && this.DEFAULT_API_URL && !this.DEFAULT_API_URL.includes('...')) {
      this.data.apiUrl = this.DEFAULT_API_URL;
    }

    this.initTheme();
    this.applyLogo();
    
    // Set active language
    const savedLang = localStorage.getItem('appLanguage') || 'id';
    this.setLanguage(savedLang);

    lucide.createIcons();
    this.checkAuth();
    this.bindEvents();
    
    if (this.data.currentUser) {
      // Immediate load from cache for blazing fast UI
      this.data.menus = JSON.parse(localStorage.getItem('menus') || '[]');
      this.data.invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
      this.data.users = JSON.parse(localStorage.getItem('users') || '[]');
      this.data.schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
      
      this.navigate('dashboard');
      
      // Silently fetch fresh data in background
      this.loadData(true);
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
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

  applyLogo() {
    let logoData = localStorage.getItem('businessLogo') || './logo.png';
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
        pdfContainer.innerHTML = `<img src="${logoData}" style="max-height: 80px; max-width: 220px; object-fit: contain;">`;
        pdfContainer.style.display = 'block';
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

  showLoading(show) {
    const el = document.getElementById('loadingOverlay');
    if (show) el.classList.remove('hidden');
    else el.classList.add('hidden');
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
    if (userJson) {
      this.data.currentUser = JSON.parse(userJson);
      document.getElementById('pageLogin').classList.add('hidden');
      document.getElementById('appLayout').classList.remove('hidden');
      this.applyRoles();
    } else {
      document.getElementById('pageLogin').classList.remove('hidden');
      document.getElementById('appLayout').classList.add('hidden');
    }
  },

  applyRoles() {
    const role = this.data.currentUser.role;
    const displayName = this.data.currentUser.name || this.data.currentUser.username;
    document.getElementById('displayUsername').textContent = displayName;
    document.getElementById('displayRole').textContent = role;

    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      if (role === 'admin') el.style.display = '';
      else el.style.display = 'none';
    });
  },

  async logout() {
    if (await this.showConfirm("Apakah Anda yakin ingin keluar?", "Konfirmasi Keluar")) {
      localStorage.removeItem('currentUser');
      this.data.currentUser = null;
      this.checkAuth();
    }
  },

  async login(username, password) {
    this.showLoading(true);
    
    // Fallback default admin
    if (username === 'admin' && password === 'admin123') {
      const user = { id: 1, username: 'admin', role: 'admin' };
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.data.currentUser = user;
      setTimeout(() => {
        this.showLoading(false);
        this.checkAuth();
        this.loadData().then(() => this.navigate('dashboard'));
      }, 500);
      return;
    }

    try {
      let usersToCheck = [];
      
      if (this.data.apiUrl) {
        // Fetch fresh users from Google Sheets to ensure we have latest passwords
        usersToCheck = await this.fetchData('Users');
      } else {
        // Offline mode fallback
        usersToCheck = JSON.parse(localStorage.getItem('users') || '[]');
      }

      const u = usersToCheck.find(x => x.username === username && x.password === password);
      
      if(u) {
        localStorage.setItem('currentUser', JSON.stringify(u));
        this.data.currentUser = u;
        this.checkAuth();
        await this.loadData();
        this.navigate('dashboard');
      } else {
        document.getElementById('loginError').classList.remove('hidden');
      }
    } catch (e) {
      console.error("Login error:", e);
      document.getElementById('loginError').classList.remove('hidden');
    } finally {
      this.showLoading(false);
    }
  },

  // === Navigation ===
  navigate(page) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (page === 'create-invoice' && role !== 'admin') {
      this.showAlert('Anda tidak memiliki akses untuk menambah/mengedit invoice.', 'error', 'Akses Ditolak');
      this.navigate('invoices');
      return;
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const viewId = 'view' + page.charAt(0).toUpperCase() + page.slice(1).replace('-', '');
    const viewEl = document.getElementById(viewId);
    if(viewEl) viewEl.classList.add('active');
    
    const navEl = document.querySelector(`.nav-link[data-page="${page}"]`);
    if(navEl) navEl.classList.add('active');

    // Page specific renders
    try {
      if(page === 'dashboard') this.renderDashboard();
      if(page === 'menus') this.renderMenus();
      if(page === 'invoices') this.renderInvoices();
      if(page === 'create-invoice') this.renderCreateInvoiceInit();
      if(page === 'schedules') this.renderSchedules();
      if(page === 'users') this.renderUsers();
      if(page === 'settings') {
        document.getElementById('settingApiUrl').value = this.data.apiUrl;
        const logoData = localStorage.getItem('businessLogo') || '';
        const urlInput = document.getElementById('settingLogoUrl');
        if (urlInput) {
          urlInput.value = logoData.startsWith('http') ? logoData : '';
        }
      }
      if(page === 'reports') this.renderReports();
    } catch(err) {
      console.error("Navigation error on page:", page, err);
      this.showAlert("Terjadi kesalahan sistem saat memuat halaman " + page, "error");
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
        const res = await fetch(`${this.data.apiUrl}?action=GET_INIT_DATA`);
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
          throw new Error("Invalid response format");
        }
      } catch (e) {
        console.error("Error loading data", e);
        this.showAlert("Failed to load data from API. Please check Settings.", "error");
      }
    }
    
    // Re-render currently active view to reflect newly loaded data
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) {
      const page = activeLink.getAttribute('data-page');
      this.navigate(page);
    }
    
    if (!quiet) this.showLoading(false);
  },

  async fetchData(sheet) {
    if(!this.data.apiUrl) return [];
    try {
      const res = await fetch(`${this.data.apiUrl}?action=GET_ALL&sheet=${sheet}`);
      const json = await res.json();
      if(json.status === 'success') return json.data;
      return [];
    } catch(e) {
      throw e;
    }
  },

  async addRow(sheet, payload) {
    this.showLoading(true);
    if (!this.data.apiUrl) {
      // Save Local
      const target = sheet.toLowerCase();
      const items = JSON.parse(localStorage.getItem(target) || '[]');
      items.push(payload);
      localStorage.setItem(target, JSON.stringify(items));
      this.data[target] = items;
    } else {
      // Save API
      try {
        await fetch(`${this.data.apiUrl}?action=ADD_ROW&sheet=${sheet}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        await this.loadData();
      } catch(e) {
        this.showAlert("Failed to save to database", "error");
      }
    }
    this.showLoading(false);
  },

  async updateRow(sheet, payload) {
    this.showLoading(true);
    if (!this.data.apiUrl) {
      const target = sheet.toLowerCase();
      let items = JSON.parse(localStorage.getItem(target) || '[]');
      const index = items.findIndex(i => i.id == payload.id);
      if(index > -1) {
        items[index] = payload;
        localStorage.setItem(target, JSON.stringify(items));
        this.data[target] = items;
      }
    } else {
      try {
        await fetch(`${this.data.apiUrl}?action=UPDATE_ROW&sheet=${sheet}`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        await this.loadData();
      } catch(e) {
        this.showAlert("Failed to update database", "error");
      }
    }
    this.showLoading(false);
  },

  async deleteRow(sheet, id) {
    this.showLoading(true);
    if (!this.data.apiUrl) {
      const target = sheet.toLowerCase();
      let items = JSON.parse(localStorage.getItem(target) || '[]');
      items = items.filter(i => i.id != id);
      localStorage.setItem(target, JSON.stringify(items));
      this.data[target] = items;
    } else {
      try {
        await fetch(`${this.data.apiUrl}?action=DELETE_ROW&sheet=${sheet}&id=${id}`);
        await this.loadData();
      } catch(e) {
        this.showAlert("Failed to delete from database", "error");
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
            <tr>
              <td><strong>${inv.customerName || '-'}</strong></td>
              <td><strong>${this.formatDate(inv.cateringDate)}</strong></td>
              <td>${inv.cateringLocation || '-'}</td>
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
          <tr>
            <td>${inv.invoiceNumber}</td>
            <td>${inv.customerName || '-'}</td>
            <td><strong>${this.formatDate(inv.cateringDate)}</strong></td>
            <td>${this.formatCurrency(inv.totalAmount)}</td>
            <td style="color: var(--color-danger); font-weight: bold;">${this.formatCurrency(remaining)}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });
    }

    this.renderDashboardChart();
  },

  renderDashboardChart() {
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    if(this.chartInstance) this.chartInstance.destroy();

    // Group by date (last 7 days)
    const dates = [];
    const totals = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = this.getLocalYMD(d);
      dates.push(dateStr);
      
      const sum = this.data.invoices
        .filter(inv => inv.createdAt.startsWith(dateStr))
        .reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
      totals.push(sum);
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Revenue (Rp)',
          data: totals,
          borderColor: '#d4af37',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { 
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
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

      const nameMatch = m.name && m.name.toLowerCase().includes(q);
      const descMatch = m.description && m.description.toLowerCase().includes(q);
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
        tbody.innerHTML += `
          <tr>
            <td>${m.id}</td>
            <td><strong>${m.name}</strong></td>
            <td>${this.formatCurrency(m.price)}</td>
            <td><span class="badge" style="background: rgba(212,175,55,0.1); color: var(--color-primary); padding: 4px 8px; border-radius: 4px; font-weight: 500;">${m.unit || 'pax'}</span></td>
            <td><span class="text-muted">${m.description || '-'}</span></td>
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
        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const name = row.name || row.Name || row.Nama || row.nama || row['Menu Name'] || row['Nama Menu'];
          const priceStr = row.price || row.Price || row.Harga || row.harga || 0;
          const description = row.description || row.Description || row.Deskripsi || row.deskripsi || '';

          if (!name) continue;

          const price = Number(String(priceStr).replace(/[^0-9.-]+/g, '')) || 0;

          const payload = {
            id: (Date.now() + i).toString(),
            name: String(name).trim(),
            price: price,
            description: String(description).trim()
          };

          await this.addRow('Menus', payload);
          successCount++;
        }

        this.showAlert(`Berhasil mengimpor ${successCount} menu baru dari file Excel!`, "success");
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

  async saveMenu(e) {
    e.preventDefault();
    const idField = document.getElementById('menuId').value;
    const isUpdate = !!idField;
    const payload = {
      id: isUpdate ? idField : Date.now().toString(),
      name: document.getElementById('menuName').value,
      price: document.getElementById('menuPrice').value,
      unit: document.getElementById('menuUnit').value,
      description: document.getElementById('menuDesc').value
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
    const input = document.getElementById('invoiceSearchText');
    this.invoiceState.searchQuery = input ? input.value.toLowerCase().trim() : '';
    this.invoiceState.currentPage = 1;
    this.renderInvoices();
  },

  clearInvoiceFilters() {
    const input = document.getElementById('invoiceSearchText');
    if (input) input.value = '';
    this.invoiceState.searchQuery = '';
    this.invoiceState.currentPage = 1;
    this.renderInvoices();
  },

  renderInvoices() {
    const table = document.getElementById('invoicesTable');
    if (!table) return;
    table.innerHTML = '';

    // 1. Filter
    let filtered = this.data.invoices.filter(inv => {
      const q = this.invoiceState.searchQuery;
      if (!q) return true;

      const numMatch = inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q);
      const nameMatch = inv.customerName && inv.customerName.toLowerCase().includes(q);
      const locMatch = inv.cateringLocation && inv.cateringLocation.toLowerCase().includes(q);
      const phoneMatch = inv.customerPhone && inv.customerPhone.toLowerCase().includes(q);
      
      return numMatch || nameMatch || locMatch || phoneMatch;
    });

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
    const showActions = (role === 'admin');

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
        } else if (inv.status === 'DP / Sebagian' || (Number(inv.paidAmount) > 0 && Number(inv.paidAmount) < Number(inv.totalAmount))) {
          statusBadge = '<span style="color:#f59e0b; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">DP / Sebagian</span>';
        } else {
          statusBadge = '<span style="color:var(--color-danger); background:rgba(239,68,68,0.1); padding:4px 8px; border-radius:4px; font-size:12px;">Belum Lunas</span>';
        }

        table.innerHTML += `
          <tr>
            <td>${inv.invoiceNumber}</td>
            <td>${inv.customerName || '-'}</td>
            <td>${inv.cateringLocation || '-'}</td>
            <td>${this.formatPhone(inv.customerPhone)}</td>
            <td>${this.formatDate(inv.cateringDate)}</td>
            <td>${this.formatCurrency(inv.totalAmount)}</td>
            <td>${statusBadge}</td>
            <td>
              <div style="display:flex; gap:4px;">
                <button class="btn btn-secondary btn-sm" onclick="app.reprintInvoice('${inv.id}')" title="Print PDF"><i data-lucide="printer" style="width:16px;"></i></button>
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

  reprintInvoice(id) {
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;

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
          <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500;">${item.name}</td>
          <td style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #f1f5f9; color: #475569;">${this.formatCurrency(item.price)}</td>
          <td style="padding: 12px 15px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #475569;">${item.qty}</td>
          <td style="padding: 12px 15px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #475569; font-weight: 500;">${item.unit || 'pax'}</td>
          <td style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">${this.formatCurrency(item.subtotal)}</td>
        </tr>
      `;
    });
    
    const finalPaid = Number(inv.paidAmount) || (inv.status === 'Lunas' ? Number(inv.totalAmount) : 0);
    const finalRemaining = Number(inv.totalAmount) - finalPaid;

    document.getElementById('pdfGrandTotal').textContent = this.formatCurrency(inv.totalAmount);
    document.getElementById('pdfPaidAmount').textContent = this.formatCurrency(finalPaid);
    document.getElementById('pdfRemainingBalance').textContent = this.formatCurrency(finalRemaining);

    // Generate Verification QR Code and wait for load
    const qrText = `Poetry's Catering Authentic Invoice\nInvoice No: ${inv.invoiceNumber}\nCustomer: ${inv.customerName || '-'}\nCatering Date: ${this.formatDate(inv.cateringDate)}\nTotal: ${this.formatCurrency(inv.totalAmount)}\nStatus: ${inv.status || 'Belum Lunas'}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;
    
    const qrImg = document.getElementById('pdfQrCode');
    
    // Simpan invoice number untuk konfirmasi cetak
    this.currentPrintInvoiceNumber = inv.invoiceNumber;
    
    qrImg.onload = () => {
      this.openModal('pdfTemplateWrapper');
    };
    qrImg.onerror = () => {
      this.openModal('pdfTemplateWrapper');
    };
    qrImg.src = qrUrl;
  },

  renderCreateInvoiceInit() {
    const select = document.getElementById('invMenuSelect');
    select.innerHTML = '<option value="">-- Choose Menu --</option>';
    this.data.menus.forEach(m => {
      select.innerHTML += `<option value="${m.id}">${m.name} - ${this.formatCurrency(m.price)}</option>`;
    });
    
    document.getElementById('invEditId').value = '';
    document.getElementById('invCustomerName').value = '';
    document.getElementById('invCustomerPhone').value = '';
    document.getElementById('invCateringLocation').value = '';
    document.getElementById('invCateringDate').value = '';
    document.getElementById('invPaidAmount').value = '0';
    document.getElementById('invDateCreated').valueAsDate = new Date();
    
    // Auto generate invoice number
    const invNum = 'INV-' + new Date().getTime().toString().slice(-6);
    document.getElementById('pdfInvNumber').textContent = invNum;
    
    this.currentInvoice.items = [];
    this.updateInvoiceItemsTable();
  },

  editInvoice(id) {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin') {
      this.showAlert("Anda tidak memiliki izin untuk mengedit invoice.", "error", "Akses Ditolak");
      return;
    }
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;
    
    // Populate menus dropdown for the edit modal
    const select = document.getElementById('editInvMenuSelect');
    if (select) {
      select.innerHTML = '<option value="">-- Pilih Menu --</option>';
      this.data.menus.forEach(m => {
        select.innerHTML += `<option value="${m.id}">${m.name} - ${this.formatCurrency(m.price)}</option>`;
      });
    }

    document.getElementById('editInvId').value = inv.id;
    document.getElementById('editInvCustomerName').value = inv.customerName || '';
    document.getElementById('editInvCustomerPhone').value = inv.customerPhone || '';
    document.getElementById('editInvCateringLocation').value = inv.cateringLocation || '';
    document.getElementById('editInvPaidAmount').value = inv.paidAmount || 0;
    
    document.getElementById('editInvCateringDate').value = inv.cateringDate ? this.getLocalYMD(inv.cateringDate) : '';
    
    // Load current items to temporary state
    this.editInvoiceState.items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    this.editInvoiceState.invoiceNumber = inv.invoiceNumber;
    
    this.updateEditInvoiceItemsTable();
    this.openModal('editInvoiceModal');
  },

  addEditInvoiceItem() {
    const menuId = document.getElementById('editInvMenuSelect').value;
    const qty = parseInt(document.getElementById('editInvMenuQty').value);
    
    if (!menuId || qty < 1) return;
    
    const menu = this.data.menus.find(m => m.id == menuId);
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
    
    let total = 0;
    this.editInvoiceState.items.forEach((item, i) => {
      total += item.subtotal;
      tbody.innerHTML += `
        <tr>
          <td style="padding: 8px;">${item.name}</td>
          <td style="text-align: right; padding: 8px;">${this.formatCurrency(item.price)}</td>
          <td style="text-align: center; padding: 8px;"><strong>${item.qty}</strong></td>
          <td style="text-align: center; padding: 8px;"><span class="badge" style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-weight: 500;">${item.unit || 'pax'}</span></td>
          <td style="text-align: right; padding: 8px; font-weight: 600;">${this.formatCurrency(item.subtotal)}</td>
          <td style="text-align: center; padding: 8px;"><button type="button" class="btn btn-danger btn-sm" style="padding: 4px 8px;" onclick="app.removeEditInvoiceItem(${i})"><i data-lucide="trash-2" style="width:14px; height: 14px;"></i></button></td>
        </tr>
      `;
    });
    
    document.getElementById('editInvGrandTotal').textContent = this.formatCurrency(total);
    lucide.createIcons();
  },

  async saveEditedInvoice(e) {
    e.preventDefault();
    const id = document.getElementById('editInvId').value;
    const inv = this.data.invoices.find(i => i.id == id);
    if (!inv) return;
    
    const totalAmount = this.editInvoiceState.items.reduce((sum, item) => sum + item.subtotal, 0);
    const paidAmount = Number(document.getElementById('editInvPaidAmount').value) || 0;
    
    const status = paidAmount >= totalAmount ? 'Lunas' : (paidAmount > 0 ? 'DP / Sebagian' : 'Belum Lunas');
    
    const payload = {
      ...inv,
      customerName: document.getElementById('editInvCustomerName').value,
      customerPhone: document.getElementById('editInvCustomerPhone').value,
      cateringLocation: document.getElementById('editInvCateringLocation').value,
      cateringDate: document.getElementById('editInvCateringDate').value,
      paidAmount: paidAmount,
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
    if (role !== 'admin') {
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
    if (role !== 'admin') {
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
    const menuId = document.getElementById('invMenuSelect').value;
    const qty = parseInt(document.getElementById('invMenuQty').value);
    
    if(!menuId || qty < 1) return;
    
    const menu = this.data.menus.find(m => m.id == menuId);
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
    }
  },

  removeInvoiceItem(index) {
    this.currentInvoice.items.splice(index, 1);
    this.updateInvoiceItemsTable();
  },

  updateInvoiceItemsTable() {
    const tbody = document.getElementById('invItemsTable');
    tbody.innerHTML = '';
    let total = 0;
    
    this.currentInvoice.items.forEach((item, i) => {
      total += item.subtotal;
      tbody.innerHTML += `
        <tr>
          <td>${item.name}</td>
          <td>${this.formatCurrency(item.price)}</td>
          <td><strong>${item.qty}</strong></td>
          <td><span class="badge" style="background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 4px; font-weight: 500;">${item.unit || 'pax'}</span></td>
          <td>${this.formatCurrency(item.subtotal)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="app.removeInvoiceItem(${i})"><i data-lucide="trash-2" style="width:16px;"></i></button></td>
        </tr>
      `;
    });
    
    this.currentInvoice.total = total;
    document.getElementById('invGrandTotal').textContent = this.formatCurrency(total);
    lucide.createIcons();
  },

  async saveInvoice() {
    const role = this.data.currentUser ? this.data.currentUser.role : 'user';
    if (role !== 'admin') {
      this.showAlert("Anda tidak memiliki izin untuk menyimpan invoice.", "error", "Akses Ditolak");
      return;
    }
    const editId = document.getElementById('invEditId').value;
    const custName = document.getElementById('invCustomerName').value;
    const custPhone = document.getElementById('invCustomerPhone').value;
    const catLocation = document.getElementById('invCateringLocation').value;
    const catDate = document.getElementById('invCateringDate').value;
    const invDate = document.getElementById('invDateCreated').value;
    const paidAmount = Number(document.getElementById('invPaidAmount').value) || 0;
    
    if(!custName || !catDate || this.currentInvoice.items.length === 0) {
      this.showAlert("Mohon isi nama customer, tanggal katering, dan minimal satu item menu.", "warning");
      return;
    }

    const isUpdate = !!editId;
    let invNum = isUpdate ? document.getElementById('pdfInvNumber').textContent : 'INV-' + new Date().getTime().toString().slice(-6);
    
    let status = 'Belum Lunas';
    if (paidAmount > 0) {
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
      cateringDate: catDate,
      items: JSON.stringify(this.currentInvoice.items),
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
    
    // Reset and navigate
    this.navigate('invoices');
  },

  confirmPrintInvoice() {
    if (this.currentPrintInvoiceNumber) {
      this.generatePDF(this.currentPrintInvoiceNumber);
    }
  },

  generatePDF(fileName) {
    this.showLoading(true);
    const pdfEl = document.getElementById('pdfContent');
    
    html2canvas(pdfEl, { scale: 2, useCORS: true }).then(canvas => {
      try {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(fileName + '.pdf');
      } catch (err) {
        console.error(err);
        this.showAlert("Gagal membuat PDF.", "error");
      } finally {
        this.closeModal('pdfTemplateWrapper');
        this.showLoading(false);
      }
    }).catch(err => {
      console.error(err);
      this.showAlert("Gagal memproses gambar struk.", "error");
      this.closeModal('pdfTemplateWrapper');
      this.showLoading(false);
    });
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
      }
      
      daysContainer.innerHTML += `
        <div class="${dayClass}" style="${style}" onclick="app.selectCalendarDate('${dateStr}')">
          ${day}
          ${dotHtml}
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
      combinedSchedules.push({
        _rawDate: inv.cateringDate,
        title: `${inv.customerName || 'Unknown'} - ${inv.invoiceNumber}`,
        subtitle: `<i data-lucide="phone" style="width:14px; vertical-align:middle;"></i> ${this.formatPhone(inv.customerPhone)}`,
        details: `Items: ${itemsArr.map(i => i.qty + 'x ' + i.name).join(', ')}`,
        badgeText: 'Invoice',
        badgeColor: 'var(--color-primary)'
      });
    });

    // Add standalone schedules
    this.data.schedules.forEach(sch => {
      if (!sch.date) return;
      combinedSchedules.push({
        _isStandalone: true,
        _rawId: sch.id,
        _rawDate: sch.date,
        title: sch.title || 'Untitled',
        subtitle: `<i data-lucide="map-pin" style="width:14px; vertical-align:middle;"></i> ${sch.location || '-'}`,
        details: sch.notes ? `Catatan: ${sch.notes}` : '',
        badgeText: sch.type || 'Booking',
        badgeColor: sch.type === 'Meeting' ? '#8b5cf6' : '#38bdf8'
      });
    });

    // 2. Filter
    let filtered = combinedSchedules.filter(item => {
      const matchName = !this.scheduleState.searchName || 
        (item.title.toLowerCase().includes(this.scheduleState.searchName.toLowerCase()));
        
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
        const day = d.getDate() || '-';
        const locale = (this.data.language === 'en') ? 'en-US' : 'id-ID';
        const month = !isNaN(d) ? d.toLocaleString(locale, { month: 'short' }) : '-';

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
              <h4 style="font-weight: 600;">${item.title}</h4>
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
    
    this.openModal('addScheduleModal');
  },

  editSchedule(id) {
    const sch = this.data.schedules.find(s => s.id == id);
    if (!sch) return;
    
    const form = document.getElementById('addScheduleForm');
    if (form) form.reset();
    
    document.getElementById('scheduleId').value = sch.id;
    document.getElementById('scheduleModalTitle').textContent = 'Edit Jadwal';
    
    document.getElementById('scheduleType').value = sch.type || 'Booking';
    document.getElementById('scheduleTitle').value = sch.title || '';
    document.getElementById('scheduleDate').value = sch.date ? this.getLocalYMD(sch.date) : '';
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

  async saveSchedule(e) {
    e.preventDefault();
    const id = document.getElementById('scheduleId').value;
    const type = document.getElementById('scheduleType').value;
    const title = document.getElementById('scheduleTitle').value;
    const date = document.getElementById('scheduleDate').value;
    const location = document.getElementById('scheduleLocation').value;
    const notes = document.getElementById('scheduleNotes').value;

    this.showLoading(true, "Menyimpan Jadwal...");
    try {
      if (id) {
        const existing = this.data.schedules.find(s => s.id == id);
        const payload = {
          ...existing,
          type: type,
          title: title,
          date: date,
          location: location,
          notes: notes
        };
        await this.updateRow('Schedules', payload);
        this.showAlert("Jadwal berhasil diperbarui!", "success");
      } else {
        const newSchedule = {
          id: Date.now().toString(),
          type: type,
          title: title,
          date: date,
          location: location,
          notes: notes,
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
    const table = document.getElementById('usersTable');
    table.innerHTML = '';
    this.data.users.forEach(u => {
      table.innerHTML += `
        <tr>
          <td>${u.username}</td>
          <td><span style="padding:4px 8px; border-radius:4px; background:rgba(255,255,255,0.1); font-size:12px;">${u.role}</span></td>
          <td>
            <div style="display:flex; gap:4px;">
              <button class="btn btn-secondary btn-sm" onclick="app.editUser('${u.id}')" title="Edit"><i data-lucide="edit-2" style="width:16px;"></i></button>
              <button class="btn btn-danger btn-sm" onclick="app.deleteUser('${u.id}')" title="Delete"><i data-lucide="trash-2" style="width:16px;"></i></button>
            </div>
          </td>
        </tr>
      `;
    });
    lucide.createIcons();
  },

  openAddUserModal() {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    this.openModal('userModal');
  },

  editUser(id) {
    const u = this.data.users.find(x => x.id == id);
    if(u) {
      document.getElementById('userId').value = u.id;
      document.getElementById('userName').value = u.username;
      document.getElementById('userPassword').value = u.password || ''; // fallback if hidden
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

  async saveUser(e) {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const payload = {
      id: id || Date.now().toString(),
      username: document.getElementById('userName').value,
      password: document.getElementById('userPassword').value,
      role: document.getElementById('userRole').value
    };
    
    if(id) {
      await this.updateRow('Users', payload);
    } else {
      await this.addRow('Users', payload);
    }
    
    this.closeModal('userModal');
    this.renderUsers();
    document.getElementById('userForm').reset();
  },

  openProfileModal() {
    if (!this.data.currentUser) return;
    
    // Find current user full data from memory
    const user = this.data.users.find(u => u.username === this.data.currentUser.username) || this.data.currentUser;
    
    document.getElementById('profileName').value = user.name || user.username;
    document.getElementById('profileUsername').value = user.username || '';
    document.getElementById('profilePassword').value = user.password || '';
    
    this.openModal('profileModal');
  },

  async saveProfile(e) {
    e.preventDefault();
    if (!this.data.currentUser) return;
    
    const name = document.getElementById('profileName').value.trim();
    const username = document.getElementById('profileUsername').value.trim();
    const password = document.getElementById('profilePassword').value.trim();
    
    if (!name || !username || !password) {
      this.showAlert("Semua field harus diisi!", "warning");
      return;
    }
    
    // Check if username is already taken by someone else
    const existing = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== this.data.currentUser.id);
    if (existing) {
      this.showAlert("Username sudah digunakan oleh akun lain. Silakan pilih username lain.", "warning");
      return;
    }
    
    this.showLoading(true, "Memperbarui data akun...");
    
    // Update currentUser local state
    const updatedUser = {
      ...this.data.currentUser,
      name: name,
      username: username,
      password: password
    };
    
    try {
      // Find full user object in this.data.users
      const index = this.data.users.findIndex(u => u.id == this.data.currentUser.id);
      let fullUserObj = index > -1 ? this.data.users[index] : { id: this.data.currentUser.id.toString(), role: this.data.currentUser.role };
      
      fullUserObj.name = name;
      fullUserObj.username = username;
      fullUserObj.password = password;
      
      // Update in Google Sheets / LocalStorage
      if (this.data.apiUrl) {
        await this.updateRow('Users', fullUserObj);
      } else {
        // Offline mode fallback
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
      
      // Update logged in user session
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      this.data.currentUser = updatedUser;
      
      // Apply the new name to Navbar
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
  renderReports() {
    const ctx = document.getElementById('reportChart').getContext('2d');
    if(this.reportChartInstance) this.reportChartInstance.destroy();
    
    // Group all invoices by month
    const monthlyData = {};
    this.data.invoices.forEach(inv => {
      const month = inv.cateringDate ? inv.cateringDate.substring(0, 7) : 'Unknown';
      monthlyData[month] = (monthlyData[month] || 0) + Number(inv.totalAmount);
    });

    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(l => monthlyData[l]);

    this.reportChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue by Month (Rp)',
          data: data,
          backgroundColor: '#d4af37',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#fff'
                }
            }
        },
        scales: { 
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff'} },
          x: { grid: { display: false }, ticks: { color: '#fff'} }
        }
      }
    });
  },

  // === Settings ===
  saveSettings() {
    const url = document.getElementById('settingApiUrl').value.trim();
    localStorage.setItem('apiUrl', url);
    this.data.apiUrl = url;
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

  getLocalYMD(val) {
    if (!val) return '';
    if (typeof val === 'string' && val.length === 10 && val.includes('-')) return val;
    const d = new Date(val);
    if (isNaN(d)) return val;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(e.currentTarget.dataset.page);
      });
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

    // Settings
    document.getElementById('btnSaveSettings').addEventListener('click', () => this.saveSettings());

    // Forms
    document.getElementById('menuForm').addEventListener('submit', (e) => this.saveMenu(e));
    document.getElementById('userForm').addEventListener('submit', (e) => this.saveUser(e));
    
    // Invoice events
    document.getElementById('btnAddMenuItem').addEventListener('click', () => this.addInvoiceItem());
    document.getElementById('btnSaveInvoice').addEventListener('click', () => this.saveInvoice());
    
    // Schedule events
    const addScheduleForm = document.getElementById('addScheduleForm');
    if (addScheduleForm) {
      addScheduleForm.addEventListener('submit', (e) => this.saveSchedule(e));
    }
  }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
