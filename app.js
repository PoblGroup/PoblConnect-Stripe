require('dotenv').config()

const express = require('express')
const app = express()
app.use(express.json())

const bodyParser = require('body-parser')

const cors = require('cors')
app.use(cors({
    origin: "https://pobl.powerappsportals.com",
    methos: ["GET", "POST"]
}))
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)

// const storeItems = new Map([
//     [1, {priceInCents: 10000, name: "Test Product One" }],
//     [2, {priceInCents: 20000, name: "Test Product Two" }]
// ])

app.get('/', (req, res) => {
    res.json("hello world")
})

app.post('/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: req.body.items.map(item => {
                return {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: item.name
                        },
                        unit_amount: item.priceInPence
                    },
                    quantity: item.quantity
                }
            }),
            success_url: `${process.env.CLIENT_URL}/make-payment/payment-confirmation`,
            cancel_url: `${process.env.CLIENT_URL}/make-payment`
        })
        res.json({ url: session.url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post('/webhook'), 
    bodyParser.raw({ type: "application/json" }), 
    async (req, res) => {
        const payload = req.body
        const sig = req.headers['stripe-signature']
        const endpointSecret = 'whsec_RrWqnwDN8p3SQM4hQXIWbyIHNeFo3fU0'

        let event;

        try {
            event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
        } catch (error) {
            console.log(error.message)
            res.status(400).json({success: failed})
            return
        }

        console.log(event.type)
        console.log(event.data.object)

        res.json({ success: true})
    }
    
app.listen(process.env.PORT || 3000)