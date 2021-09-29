require('dotenv').config()

const express = require('express')
const app = express()
// app.use(express.json())

const cors = require('cors')
app.use(cors({
    origin: "https://pobl.powerappsportals.com",
}))

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)
const {google} = require('googleapis')
const nodemailer = require('nodemailer');

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI
const REFRESH_TOKEN = process.env.REFRESH_TOKEN

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: REFRESH_TOKEN})

const sendMail = async (eventObj) => {

    const amount = eventObj.amount

    try {
        // Get access token
        const accessToken = await oAuth2Client.getAccessToken()

        // Mailing
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'rich.griffiths89@gmail.com',
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken
            }
        })

        const mailOptions = {
            from: 'rich.griffiths89@gmail.com',
            to: 'richard.griffiths1@poblgroup.co.uk',
            subject: 'Hello From Stripe',
            text: `New Payment! Amount: ${amount}`,
            html: `<h2>New Payment Created!</h2><p>Total Amount Paid: <strong>${amount}</strong></p><p>`
        };

        const result = await transport.sendMail(mailOptions)
        return result

    } catch (error) {
        return error
    }
}

// GET ROUTE
app.get('/', (req, res) => {
    res.json("hello world")
})

// POST - Create Checkout Session (Payment)
app.post('/create-checkout-session', express.json(), async (req, res) => {
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
            client_reference_id: req.body.accountId,
            success_url: `${process.env.CLIENT_URL}/make-payment/payment-confirmation`,
            cancel_url: `${process.env.CLIENT_URL}/make-payment`
        })
        res.json({ url: session.url })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST - Stripe endpoint for business tasks after successful payment
app.post('/webhook', express.raw({ type: "application/json" }), async (req, res) => { 
    // Ensure call is from stripe
    const payload = req.body
    const sig = req.headers['stripe-signature']
    const endpointSecret = 'whsec_RrWqnwDN8p3SQM4hQXIWbyIHNeFo3fU0'

    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.created':
            const paymentCreated = event.data.object;
            console.log("PAYMENT CREATED", paymentCreated)
            break;
        case 'payment_intent.succeeded':
            const paymentSucceeded = event.data.object;
            console.log('PAYMENT SUCCEEDED');
            sendMail(paymentSucceeded).then(result => console.log('Email Sent...', result)).catch(err => console.log(err.message))
            break;
        default:
            console.log("Unhandled event type");
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
})
    
app.listen(process.env.PORT || 3000)