// Gestione autenticazione

class AuthManager {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        // Controlla sessione esistente
        const { data: { session } } = await supabaseClient.auth .getSession();
        if (session) {
            this.user = session.user;
            this.showMainApp();
        } else {
            this.showLoginForm();
        }

        // Ascolta cambiamenti di autenticazione
        supabaseClient.auth .onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                this.showMainApp();
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.showLoginForm();
            }
        });
    }

    async signUp(email, password) {
        const { data, error } = await supabaseClient.auth .signUp({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth .signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        return data;
    }

    async signOut() {
        const { error } = await supabaseClient.auth .signOut();
        if (error) {
            throw error;
        }
    }

    showLoginForm() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Inizializza l'app principale
        if (window.registroApp) {
            window.registroApp.init();
        }
    }

    getCurrentUser() {
        return this.user;
    }
}

// Inizializza auth manager
window.authManager = new AuthManager();