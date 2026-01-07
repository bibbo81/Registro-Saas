// Applicazione principale per il Registro dei Corrispettivi

class RegistroApp {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.currentTab = 'dashboard';
        this.data = {};
        this.mesi = [
            'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
        ];
        this.giorniPerMese = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        
        this.isLoading = false;
        this.autoSaveTimeout = null;
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.renderApp();
        this.showTab('dashboard');
    }

    async loadUserData() {
        try {
            this.showLoading(true);
            
            // Carica dati corrispettivi per l'anno corrente
            const { data: corrispettivi, error } = await supabaseClient
                .from('corrispettivi')
                .select('*')
                .eq('anno', this.currentYear);

            if (error) throw error;

            // Inizializza struttura dati
            this.initializeDataStructure();

            // Popola con dati dal database
            if (corrispettivi) {
                corrispettivi.forEach(record => {
                    if (this.data[record.mese] && this.data[record.mese][record.giorno - 1]) {
                        this.data[record.mese][record.giorno - 1] = {
                            corrispettivi: parseFloat(record.corrispettivi_giornalieri) || 0,
                            fatture: parseFloat(record.incassi_fatturati) || 0,
                            note: record.note || ''
                        };
                    }
                });
            }

        } catch (error) {
            console.error('Errore nel caricamento dati:', error);
            this.showAlert('Errore nel caricamento dei dati', 'error');
            this.initializeDataStructure();
        } finally {
            this.showLoading(false);
        }
    }

    initializeDataStructure() {
        this.mesi.forEach((mese, index) => {
            this.data[mese] = [];
            for (let giorno = 1; giorno <= this.giorniPerMese[index]; giorno++) {
                this.data[mese].push({
                    corrispettivi: 0,
                    fatture: 0,
                    note: ''
                });
            }
        });
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            authManager.signOut();
        });

        // Esportazione Excel
        document.getElementById('export-excel').addEventListener('click', () => {
            this.exportToExcel();
        });

        // Backup
        document.getElementById('backup-data').addEventListener('click', () => {
            this.createBackup();
        });

        // Cambio anno
        document.getElementById('year-selector').addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.loadUserData();
        });
    }

    renderApp() {
        const app = document.getElementById('main-app');
        const user = authManager.getCurrentUser();
        if (!user || !user.email) {
            // Se non autenticato o manca email, mostra login o messaggio di errore
            if (this.showLoginForm) {
                this.showLoginForm();
            } else {
                app.innerHTML = '<div class="alert alert-error">Utente non autenticato o dati utente non validi.</div>';
            }
            return;
        }

        app.innerHTML = `
            <div class="app-header">
                <div class="user-info">
                    <span>Benvenuto, ${user.email ? user.email : 'utente'}</span>
                    <button id="logout-btn" class="logout-btn" type="button">Logout</button>
                </div>
                <h1>Registro dei Corrispettivi</h1>
                <div class="year-selector">
                    <label for="year-selector">Anno: </label>
                    <select id="year-selector">
                        ${this.generateYearOptions()}
                    </select>
                </div>
            </div>
            <nav class="nav-tabs">
                <button class="nav-tab active" data-tab="dashboard">Dashboard</button>
                ${this.mesi.map(mese => 
                    `<button class="nav-tab" data-tab="${mese}">${this.capitalize(mese)}</button>`
                ).join('')}
            </nav>

            <div class="tab-content">
                <div class="actions-bar">
                    <button id="export-excel" class="btn btn-export">📊 Esporta Excel</button>
                    <button id="backup-data" class="btn btn-backup">💾 Backup Dati</button>
                </div>

                <div id="dashboard" class="content-section active">
                    ${this.renderDashboard()}
                </div>

                ${this.mesi.map(mese => 
                    `<div id="${mese}" class="content-section">
                        ${this.renderMonth(mese)}
                    </div>`
                ).join('')}
            </div>
        `;
        // Rimuovi eventuali attributi onclick residui dal DOM
        setTimeout(() => {
            app.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
        }, 0);

        // Event binding DOPO che l'HTML è stato inserito
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.getElementById('export-excel')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('backup-data')?.addEventListener('click', () => this.createBackup());
        document.getElementById('year-selector')?.addEventListener('change', (e) => this.changeYear(e.target.value));
        
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showTab(btn.dataset.tab);
            });
        });
    }
    generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let year = currentYear - 5; year <= currentYear + 1; year++) {
            options += `<option value="${year}" ${year === this.currentYear ? 'selected' : ''}>${year}</option>`;
        }
        return options;
    }

    renderDashboard() {
        const stats = this.calculateYearlyStats();
        
        return `
            <h2>Riepilogo Anno ${this.currentYear}</h2>
            
            <div class="dashboard-grid">
                <div class="stats-card">
                    <h3>Corrispettivi Totali</h3>
                    <div class="stats-value">€${stats.totaleCorrispettivi.toFixed(2)}</div>
                    <div class="stats-label">Anno ${this.currentYear}</div>
                </div>
                <div class="stats-card">
                    <h3>Fatture Totali</h3>
                    <div class="stats-value">€${stats.totaleFatture.toFixed(2)}</div>
                    <div class="stats-label">Anno ${this.currentYear}</div>
                </div>
                <div class="stats-card">
                    <h3>Incasso Complessivo</h3>
                    <div class="stats-value">€${stats.totaleComplessivo.toFixed(2)}</div>
                    <div class="stats-label">Anno ${this.currentYear}</div>
                </div>
                <div class="stats-card">
                    <h3>Media Mensile</h3>
                    <div class="stats-value">€${stats.mediaMensile.toFixed(2)}</div>
                    <div class="stats-label">Media corrispettivi</div>
                </div>
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Mese</th>
                        <th>Corrispettivi (€)</th>
                        <th>Fatture (€)</th>
                        <th>Totale (€)</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.mesi.map(mese => {
                        const monthStats = this.calculateMonthStats(mese);
                        return `
                            <tr>
                                <td>${this.capitalize(mese)}</td>
                                <td>€${monthStats.corrispettivi.toFixed(2)}</td>
                                <td>€${monthStats.fatture.toFixed(2)}</td>
                                <td>€${monthStats.totale.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="grand-total">
                        <td>TOTALE ANNO</td>
                        <td>€${stats.totaleCorrispettivi.toFixed(2)}</td>
                        <td>€${stats.totaleFatture.toFixed(2)}</td>
                        <td>€${stats.totaleComplessivo.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    renderMonth(mese) {
        const monthIndex = this.mesi.indexOf(mese);
        const monthStats = this.calculateMonthStats(mese);
        
        return `
            <h2>${this.capitalize(mese)} ${this.currentYear}</h2>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Giorno</th>
                        <th>Corrispettivi (€)</th>
                        <th>Fatture (€)</th>
                        <th>Totale (€)</th>
                        <th>Note</th>
                    </tr>
                </thead>
                <tbody>
                    ${Array.from({length: this.giorniPerMese[monthIndex]}, (_, i) => {
                        const dayData = this.data[mese][i];
                        const totale = dayData.corrispettivi + dayData.fatture;
                        
                        return `
                            <tr>
                                <td>${i + 1}</td>
                                <td>
                                    <input type="number" step="0.01" min="0" 
                                           value="${dayData.corrispettivi}" 
                                           onchange="registroApp.updateValue('${mese}', ${i}, 'corrispettivi', this.value)">
                                </td>
                                <td>
                                    <input type="number" step="0.01" min="0" 
                                           value="${dayData.fatture}" 
                                           onchange="registroApp.updateValue('${mese}', ${i}, 'fatture', this.value)">
                                </td>
                                <td>€${totale.toFixed(2)}</td>
                                <td>
                                    <input type="text" 
                                           value="${dayData.note}" 
                                           onchange="registroApp.updateValue('${mese}', ${i}, 'note', this.value)"
                                           placeholder="Note...">
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="totals-row">
                        <td>TOTALI</td>
                        <td>€${monthStats.corrispettivi.toFixed(2)}</td>
                        <td>€${monthStats.fatture.toFixed(2)}</td>
                        <td>€${monthStats.totale.toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    showTab(tabName) {
        // Rimuovi active da tutti i tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Attiva il tab selezionato
        event.target.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        this.currentTab = tabName;
    }

    async updateValue(mese, dayIndex, field, value) {
        try {
            if (field === 'note') {
                this.data[mese][dayIndex][field] = value;
            } else {
                this.data[mese][dayIndex][field] = parseFloat(value) || 0;
            }

            // Auto-save con debounce
            this.scheduleAutoSave(mese, dayIndex);
            
            // Aggiorna visualizzazione
            this.updateDisplayTotals(mese, dayIndex);

        } catch (error) {
            console.error('Errore nell\'aggiornamento:', error);
            this.showAlert('Errore nel salvataggio', 'error');
        }
    }

    scheduleAutoSave(mese, dayIndex) {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        this.autoSaveTimeout = setTimeout(async () => {
            await this.saveToDatabase(mese, dayIndex + 1);
        }, 1000); // Salva dopo 1 secondo di inattività
    }

    async saveToDatabase(mese, giorno) {
    try {
        const user = authManager.getCurrentUser();
        if (!user) {
            this.showAlert('Utente non autenticato', 'error');
            return;
        }
        const dayData = this.data[mese]?.[giorno - 1];
        if (!dayData) {
            this.showAlert('Dati non trovati per il giorno selezionato', 'error');
            return;
        }

        const { error } = await supabaseClient
            .from('corrispettivi')
            .upsert({
                user_id: user.id,
                anno: this.currentYear,
                mese: mese,
                giorno: giorno,
                corrispettivi_giornalieri: dayData.corrispettivi,
                incassi_fatturati: dayData.fatture,
                note: dayData.note || ''
            }, {
                onConflict: 'user_id,anno,mese,giorno'
            });

        if (error) throw error;

        this.showAlert('Dati salvati automaticamente', 'success', 2000);

    } catch (error) {
        console.error('Errore nel salvataggio:', error);
        this.showAlert('Errore nel salvataggio automatico', 'error');
    }
}


    updateDisplayTotals(mese, dayIndex) {
        // Aggiorna il totale del giorno nella tabella
        const dayTotal = this.data[mese][dayIndex].corrispettivi + this.data[mese][dayIndex].fatture;
        const currentSection = document.getElementById(mese);
        if (currentSection) {
            const dayRow = currentSection.querySelectorAll('tbody tr')[dayIndex];
            if (dayRow) {
                dayRow.cells[3].textContent = `€${dayTotal.toFixed(2)}`;
            }

            // Aggiorna i totali del mese
            const monthStats = this.calculateMonthStats(mese);
            const footerRow = currentSection.querySelector('tfoot tr');
            if (footerRow) {
                footerRow.cells[1].textContent = `€${monthStats.corrispettivi.toFixed(2)}`;
                footerRow.cells[2].textContent = `€${monthStats.fatture.toFixed(2)}`;
                footerRow.cells[3].textContent = `€${monthStats.totale.toFixed(2)}`;
            }
        }

        // Aggiorna dashboard se visibile
        if (this.currentTab === 'dashboard') {
            document.getElementById('dashboard').innerHTML = this.renderDashboard();
        }
    }

    calculateMonthStats(mese) {
        let corrispettivi = 0;
        let fatture = 0;

        this.data[mese].forEach(day => {
            corrispettivi += day.corrispettivi;
            fatture += day.fatture;
        });

        return {
            corrispettivi,
            fatture,
            totale: corrispettivi + fatture
        };
    }

    calculateYearlyStats() {
        let totaleCorrispettivi = 0;
        let totaleFatture = 0;

        this.mesi.forEach(mese => {
            const monthStats = this.calculateMonthStats(mese);
            totaleCorrispettivi += monthStats.corrispettivi;
            totaleFatture += monthStats.fatture;
        });

        return {
            totaleCorrispettivi,
            totaleFatture,
            totaleComplessivo: totaleCorrispettivi + totaleFatture,
            mediaMensile: totaleCorrispettivi / 12
        };
    }

    async exportToExcel() {
        try {
            this.showLoading(true);
            
            // Crea workbook
            const wb = XLSX.utils.book_new();
            
            // Foglio dashboard
            const dashboardData = this.prepareDashboardData();
            const dashboardWS = XLSX.utils.aoa_to_sheet(dashboardData);
            XLSX.utils.book_append_sheet(wb, dashboardWS, 'Dashboard');
            
            // Fogli mensili
            this.mesi.forEach(mese => {
                const monthData = this.prepareMonthData(mese);
                const monthWS = XLSX.utils.aoa_to_sheet(monthData);
                XLSX.utils.book_append_sheet(wb, monthWS, this.capitalize(mese));
            });
            
            // Scarica file
            XLSX.writeFile(wb, `Registro_Corrispettivi_${this.currentYear}.xlsx`);
            
            this.showAlert('File Excel esportato con successo!', 'success');

        } catch (error) {
            console.error('Errore nell\'esportazione:', error);
            this.showAlert('Errore nell\'esportazione Excel', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    prepareDashboardData() {
        const stats = this.calculateYearlyStats();
        const data = [
            [`Registro dei Corrispettivi - Anno ${this.currentYear}`],
            [''],
            ['Mese', 'Corrispettivi (€)', 'Fatture (€)', 'Totale (€)']
        ];

        this.mesi.forEach(mese => {
            const monthStats = this.calculateMonthStats(mese);
            data.push([
                this.capitalize(mese),
                monthStats.corrispettivi.toFixed(2),
                monthStats.fatture.toFixed(2),
                monthStats.totale.toFixed(2)
            ]);
        });

        data.push([
            'TOTALE ANNO',
            stats.totaleCorrispettivi.toFixed(2),
            stats.totaleFatture.toFixed(2),
            stats.totaleComplessivo.toFixed(2)
        ]);

        return data;
    }

    prepareMonthData(mese) {
        const monthIndex = this.mesi.indexOf(mese);
        const data = [
            [`${this.capitalize(mese)} ${this.currentYear}`],
            [''],
            ['Giorno', 'Corrispettivi (€)', 'Fatture (€)', 'Totale (€)', 'Note']
        ];

        for (let i = 0; i < this.giorniPerMese[monthIndex]; i++) {
            const dayData = this.data[mese][i];
            const totale = dayData.corrispettivi + dayData.fatture;
            
            data.push([
                i + 1,
                dayData.corrispettivi.toFixed(2),
                dayData.fatture.toFixed(2),
                totale.toFixed(2),
                dayData.note
            ]);
        }

        const monthStats = this.calculateMonthStats(mese);
        data.push([
            'TOTALI',
            monthStats.corrispettivi.toFixed(2),
            monthStats.fatture.toFixed(2),
            monthStats.totale.toFixed(2),
            ''
        ]);

        return data;
    }

    async createBackup() {
    try {
        this.showLoading(true);

        const user = authManager.getCurrentUser();
        const backup = {
            timestamp: new Date().toISOString(),
            anno: this.currentYear,
            user: user ? user.email : '', // Evita crash se non loggato
            data: this.data,
            stats: this.calculateYearlyStats()
        };

        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `backup_corrispettivi_${this.currentYear}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.showAlert('Backup creato con successo!', 'success');

    } catch (error) {
        console.error('Errore nel backup:', error);
        this.showAlert('Errore nella creazione del backup', 'error');
    } finally {
        this.showLoading(false);
    }
}

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
        this.isLoading = show;
    }

    showAlert(message, type = 'info', duration = 5000) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        const container = document.querySelector('.tab-content');
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, duration);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Inizializza app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.registroApp = new RegistroApp();
});

// Make a global logout function for legacy HTML support
window.logout = async function() {
  try {
    await authManager.signOut();
    // Optionally, show login form or reload
    // location.reload();
  } catch (error) {
    alert('Errore durante il logout: ' + error.message);
  }
};