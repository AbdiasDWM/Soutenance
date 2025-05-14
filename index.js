const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const nodemailer = require('nodemailer');
const collection = require('./config'); // Assure-toi que ce fichier connecte bien à ta BDD
const stripe = require('stripe')('sk_test_51R03qDJwcVMzWhcTzzPgDqrmsV1gATjXrrl1ElkstFWkLVlBwu0ege9l4XvyYM3WZQKrIm7qLxqkq4ug1urybdUZ00zkzLWwV4');

const app = express(); // ✅ Manquait cette ligne

// Configuration des sessions
app.use(session({
    secret: 'secret-key-super-securisee',
    resave: false,
    saveUninitialized: true
}));

// Middleware pour les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Définir EJS comme moteur de template
app.set('view engine', 'ejs');
app.set('views', __dirname); // Dossier contenant les vues

// Servir les fichiers statiques (HTML, CSS, PDF, etc.)
app.use(express.static(__dirname));
app.use('/pdf', express.static(path.join(__dirname, 'pdf')));

// Configuration de Nodemailer (ici avec Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Utilise le service Gmail
    auth: {
        user: 'tonemail@gmail.com',  // Ton adresse email
        pass: 'tonmotdepasse'         // Ton mot de passe d'application Gmail
    }
});

// ========== ROUTES ========== //

// Page login
app.get('/', (req, res) => {
    res.render('login');
});

// Page signup
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Page protégée : accueil
app.get('/home', (req, res) => {
    const username = req.session.user ? req.session.user.name : null;
    res.render('home', { username }); // username sera null si non connecté
});

// Création de session Stripe
app.post('/create-checkout-session', async (req, res) => {
    try {
        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'XOF',
                    product_data: {
                        name: 'Recettes de cuisine PDF',
                    },
                    unit_amount: 5000, // 29.99€
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'http://localhost:5000/access', // Redirection après paiement réussi
            cancel_url: 'http://localhost:5000/home?payment=cancel' // Redirection après annulation
        });

        res.json({ id: stripeSession.id });
    } catch (err) {
        console.error("Erreur Stripe :", err);
        res.status(500).json({ error: err.message });
    }
});

// Inscription
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await collection.findOne({ email });
        if (existingUser) {
            return res.send("Email déjà utilisé.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { name, email, password: hashedPassword };

        await collection.insertOne(newUser);

        req.session.user = newUser;
        res.redirect('/home');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors de l'inscription.");
    }
});

// Connexion
app.post('/login', async (req, res) => {
    const { name, password } = req.body;

    try {
        const user = await collection.findOne({ name });
        if (!user) {
            return res.send("Nom d'utilisateur introuvable.");
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.send("Mot de passe incorrect.");
        }

        req.session.user = user;
        res.redirect('/home');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erreur lors de la connexion.");
    }
});

// Déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erreur de déconnexion :", err);
            return res.status(500).send("Erreur lors de la déconnexion.");
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Page d'accès au produit après paiement
app.get('/access', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    // Récupère l'adresse email de l'utilisateur
    const email = req.session.user.email;

    // Prépare le contenu de l'email
    const mailOptions = {
        from: 'avatarnn2@gmail.com',  // Ton adresse email
        to: email,                   // L'email de l'utilisateur
        subject: 'Votre achat a été validé !',
        text: `Bonjour ${req.session.user.name},\n\nMerci pour votre achat !\n\nVous pouvez télécharger votre produit ici : http://localhost:5000/product1.pdf\n\nCordialement,\nL'équipe`
    };

    // Envoi de l'email
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email envoyé avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);
    }

    // Page de confirmation d'accès au produit
    res.render('access', {
        username: req.session.user.name,
        downloadLink: '/pdf/recettes-cuisine.pdf'
    });
});

// ========== LANCEMENT DU SERVEUR ========== //
const port = 5000;
app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
});
