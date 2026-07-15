const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.zgye7fw.mongodb.net/?appName=Cluster0`
const client = new MongoClient(uri);

const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

const verifyToken = async (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorize access' })
    }

    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: "unathorize access" })
    }

    try {
        const userInfo = await admin.auth().verifyIdToken(token)
        req.token_email = userInfo.email;
        next();
    } catch {
        res.status(401).send({ message: "unvalid token" });
    }
}

async function run() {
    try {
        await client.connect();
        const PawMartDB = client.db("PawMart");
        const bannerCollection = PawMartDB.collection("banner");
        const productsCollection = PawMartDB.collection("products");
        const ordersCollection = PawMartDB.collection("orders");

        //banner section
        app.get("/banner", async (req, res) => {
            const cursor = bannerCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post("/banner", async (req, res) => {
            const newBanner = req.body;
            const result = await bannerCollection.insertOne(newBanner);
            res.send(result);
        });


        //products
        app.get("/products", async (req, res) => {
            const cursor = productsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get("/products/:category", async (req, res) => {
            const category = req.params.category;
            const query = {
                category: category
            }
            const cursor = productsCollection.find(query)
            const result = await cursor.toArray();
            res.send(result);
        })

        app.patch("/products/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updatedDate = req.body;
            const query = {
                _id: new ObjectId(id)
            };
            const updateProduct = {
                $set: updatedDate
            };
            const result = await productsCollection.updateOne(query, updateProduct);
            res.send(result)
        })

        app.get("/products/details/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        app.delete("/products/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        //addListing
        app.get("/addListing", verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            if (email !== req.token_email) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        });

        app.post("/addListing", verifyToken, async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        })

        //orders
        app.get("/orders", verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = {};
            if (email !== req.token_email) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        })

        app.post("/orders", verifyToken, async (req, res) => {
            const newOrders = req.body;
            const result = await ordersCollection.insertOne(newOrders);
            res.send(result);
        })


    } catch (err) {
        console.dir(err);
    }
}

run()

app.get("/", (req, res) => {
    res.send('server is running');
});

app.listen(port, () => {
    console.log(`server is running in port, ${port}`);
})