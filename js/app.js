/**
 * MLM Pro System - Core Logic v2.0
 * Rebuilt for robustness, transparency, and simulation capabilities.
 */

class MLMSystem {
    constructor() {
        this.dbName = 'mlm_db_v2';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.dbName)) {
            this.resetSystem();
        }
    }

    resetSystem() {
        const initialData = {
            users: [
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
                commissionRates: [10, 5, 3, 2, 1], // Level 1 to 5 (%)
            },
            transactions: []
        };
        this.saveData(initialData);
        console.log("System initialized/reset.");
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    // --- Authentication ---

    login(username, password) {
        const data = this.getData();
        const user = data.users.find(u => u.username === username && u.password === password);
        if (user) return { success: true, user };
        return { success: false, message: 'Feil brukernavn eller passord.' };
    }

    registerUser(username, password, name, sponsorId) {
        const data = this.getData();
        
        if (data.users.find(u => u.username === username)) {
            return { success: false, message: 'Brukernavn er opptatt.' };
        }

        // Validate Sponsor
        let sponsor = data.users.find(u => u.id === sponsorId);
        if (!sponsor) {
            console.warn(`Sponsor ${sponsorId} not found, defaulting to root.`);
            sponsorId = 'root';
        }

        const newUser = {
            id: 'u_' + Math.floor(Math.random() * 1000000),
            username,
            password,
            name,
            sponsorId: sponsorId,
            balance: 0,
            totalEarnings: 0,
            role: 'member',
            joinedAt: new Date().toISOString()
        };

        data.users.push(newUser);
        this.saveData(data);
        return { success: true, user: newUser };
    }

    // --- Core Business Logic ---

    getDownline(userId) {
        const data = this.getData();
        // Return direct recruits
        return data.users.filter(u => u.sponsorId === userId);
    }

    // Recursive function to get full tree (for admin)
    getFullGenealogy() {
        const data = this.getData();
        // A simple flat list for now, but could be built into a tree
        return data.users;
    }

    purchaseProduct(userId, productId) {
        const data = this.getData();
        const buyer = data.users.find(u => u.id === userId);
        const product = data.products.find(p => p.id === productId);

        if (!buyer || !product) return { success: false, message: 'Feil ved kjøp.' };

        // 1. Record Transaction
        const transaction = {
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId,
            userName: buyer.name,
            productId,
            productName: product.name,
            amount: product.price,
            date: new Date().toISOString(),
            commissions: [] // Store who got what
        };

        // 2. Calculate Commissions (5 Levels)
        let currentSponsorId = buyer.sponsorId;
        
        for (let level = 0; level < 5; level++) {
            if (!currentSponsorId) break;

            const sponsor = data.users.find(u => u.id === currentSponsorId);
            if (!sponsor) break;

            const rate = data.settings.commissionRates[level];
            const commissionAmount = (product.price * rate) / 100;

            if (commissionAmount > 0) {
                sponsor.balance += commissionAmount;
                sponsor.totalEarnings += commissionAmount;

                transaction.commissions.push({
                    level: level + 1,
                    receiverId: sponsor.id,
                    receiverName: sponsor.name,
                    amount: commissionAmount,
                    rate: rate
                });
            }

            // Move up
            currentSponsorId = sponsor.sponsorId;
        }

        data.transactions.unshift(transaction); // Add to top
        this.saveData(data);
        return { success: true, message: 'Kjøp gjennomført!', transaction };
    }

    // --- Admin Tools ---

    updateSettings(rates) {
        const data = this.getData();
        data.settings.commissionRates = rates.map(Number);
        this.saveData(data);
    }

    // --- Simulator (The "Magic" Button) ---
    // Creates a 5-level deep structure and triggers a purchase at the bottom
    runSimulation() {
        this.resetSystem();
        
        // Create a chain: Root -> A -> B -> C -> D -> E
        const users = ['A', 'B', 'C', 'D', 'E'];
        let lastSponsorId = 'root';
        let createdUsers = [];

        users.forEach((name, index) => {
            const res = this.registerUser(`user${name}`, 'pass', `Medlem ${name}`, lastSponsorId);
            if (res.success) {
                lastSponsorId = res.user.id;
                createdUsers.push(res.user);
            }
        });

        // The last user (E) buys a Startpakke (1000 NOK)
        const buyer = createdUsers[createdUsers.length - 1]; // E
        const purchaseRes = this.purchaseProduct(buyer.id, 'p1');

        // Create a detailed log for the admin
        let log = `<strong>Simulering Resultat:</strong><br>`;
        log += `1. Opprettet kjede: Root -> A -> B -> C -> D -> E<br>`;
        log += `2. 'Medlem E' kjøpte Startpakke (1000 kr)<br>`;
        log += `3. <strong>Provisjonsfordeling:</strong><br>`;
        
        if (purchaseRes.transaction && purchaseRes.transaction.commissions) {
            purchaseRes.transaction.commissions.forEach(c => {
                log += `- Nivå ${c.level}: ${c.receiverName} fikk <strong>${c.amount} kr</strong> (${c.rate}%)<br>`;
            });
        }

        return {
            success: true,
            message: log,
            purchaseResult: purchaseRes
        };
    }
}

const mlmApp = new MLMSystem();
