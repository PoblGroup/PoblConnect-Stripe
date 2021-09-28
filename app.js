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

const CLIENT_ID = '150412397872-1upb1ov0jqag8lvk2cu2el5vt6nb6hgo.apps.googleusercontent.com'
const CLIENT_SECRET = 'UupPHsPXiPhydATPmD5w-Ejh'
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04KySRQdUODV_CgYIARAAGAQSNwF-L9Irkc_jy7bYXFX_osdLe8Y5fLJ_vWY3CSq-Ti8DGYlnEloxBWDudHmU9bY9QChdzeV9fUg'

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({refresh_token: REFRESH_TOKEN})

const sendMail = async () => {
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
            text: 'New Payment Created!',
            html: '<h1>New Payment Created!</h1>'
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
            console.log("PAYMENT CREATED")
            const paymentCreated = event.data.object;
            sendMail().then(result => console.log('Email Sent...', result))
            .catch(err => console.log(err.message))
            break;
        case 'payment_intent.succeeded':
            console.log('PAYMENT SUCCEEDED');
            const paymentSucceeded = event.data.object;
            break;
        default:
            console.log("Unhandled event type");
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
})
    
app.listen(process.env.PORT || 3000)