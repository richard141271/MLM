/**
 * MLM System Core Logic
 * Handles data persistence, user management, and commission calculations.
 */

class MLMSystem {
    constructor() {
        this.dbName = 'mlm_db_v1';
        this.init();
    }

    // Initialize database if empty
    init() {
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                users: [
                    // Root user (The Company/Admin)
                    { 
                        id: 'root', 
                        username: 'admin', 
                        password: 'admin', 
                        name: 'System Admin', 
                        sponsorId: null, 
                        balance: 0, 
                        totalEarnings: 0,
                        role: 'admin',
                        joinedAt: new Date().toISOString()
                    }
                ],
                products: [
                    { id: 'p1', name: 'Startpakke', price: 1000, commissionable: true },
                    { id: 'p2', name: 'Helsekost', price: 500, commissionable: true },
                    { id: 'sub1', name: 'Månedlig Abonnement', price: 200, isSubscription: true, commissionable: true }
                ],
                settings: {
                    commissionRates: [10, 5, 3, 2, 1], // Percentage for level 1 to 5
                    currency: 'NOK'
                },
                transactions: []
            };
            this.saveData(initialData);
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    // --- User Management ---

    registerUser(username, password, name, sponsorId) {
        const data = this.getData();
        
        if (data.users.find(u => u.username === username)) {
            return { success: false, message: 'Brukernavn er opptatt.' };
        }

        const sponsor = data.users.find(u => u.id === sponsorId);
        if (!sponsor && sponsorId !== null) {
            return { success: false, message: 'Sponsor finnes ikke.' };
        }

        const newUser = {
            id: 'u_' + Date.now(),
            username,
            password,
            name,
            sponsorId: sponsorId || 'root', // Default to root if no sponsor provided
            balance: 0,
            totalEarnings: 0,
            role: 'member',
            joinedAt: new Date().toISOString()
        };

        data.users.push(newUser);
        this.saveData(data);
        return { success: true, user: newUser };
    }

    login(username, password) {
        const data = this.getData();
        const user = data.users.find(u => u.username === username && u.password === password);
        if (user) return { success: true, user };
        return { success: false, message: 'Feil brukernavn eller passord.' };
    }

    getUser(id) {
        return this.getData().users.find(u => u.id === id);
    }

    getDownline(userId) {
        const data = this.getData();
        // Simple direct recruits find
        return data.users.filter(u => u.sponsorId === userId);
    }

    // --- Shop & Commission System ---

    getProducts() {
        return this.getData().products;
    }

    // The Core 5-Level Commission Algorithm
    purchaseProduct(userId, productId) {
        const data = this.getData();
        const buyer = data.users.find(u => u.id === userId);
        const product = data.products.find(p => p.id === productId);

        if (!buyer || !product) return { success: false, message: 'Ugyldig kjøp.' };

        // Record the transaction
        const transaction = {
            id: 'tx_' + Date.now(),
            userId,
            productId,
            amount: product.price,
            date: new Date().toISOString(),
            type: product.isSubscription ? 'subscription' : 'purchase'
        };
        data.transactions.push(transaction);

        // Distribute Commissions
        let currentSponsorId = buyer.sponsorId;
        let distributedLog = [];

        // Loop through 5 levels
        for (let i = 0; i < 5; i++) {
            if (!currentSponsorId) break;

            const sponsor = data.users.find(u => u.id === currentSponsorId);
            if (!sponsor) break;

            // Get rate for this level
            const rate = data.settings.commissionRates[i] || 0;
            const commissionAmount = (product.price * rate) / 100;

            if (commissionAmount > 0) {
                sponsor.balance += commissionAmount;
                sponsor.totalEarnings += commissionAmount;
                
                distributedLog.push({
                    level: i + 1,
                    receiver: sponsor.username,
                    amount: commissionAmount,
                    rate: rate + '%'
                });
            }

            // Move up to the next sponsor
            currentSponsorId = sponsor.sponsorId;
        }

        this.saveData(data);
        return { success: true, message: 'Kjøp gjennomført!', commissions: distributedLog };
    }

    // --- Admin ---
    
    updateSettings(newRates) {
        const data = this.getData();
        data.settings.commissionRates = newRates.map(r => parseFloat(r));
        this.saveData(data);
        return { success: true };
    }

    getAllUsers() {
        return this.getData().users;
    }

    resetSystem() {
        localStorage.removeItem(this.dbName);
        this.init();
    }
}

// Global instance
const mlmApp = new MLMSystem();
