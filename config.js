const mongoose = require("mongoose");
const connect = mongoose.connect("mongodb+srv://avatarnn2:Oj2UOeEr5g5uRUs5@cluster0.fambwio.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

connect.then(() => {
    console.log("Database conect Successfully");
}).catch(() => {
    console.log("Database cannot be connected");
});

// Créer le schema
const loginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true // ✅ ceci empêche les doublons
    },
    password: {
        type: String,
        required: true
    }
});

// Collection
const collection = new mongoose.model("users", loginSchema);

module.exports = collection;
