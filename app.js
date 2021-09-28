require('dotenv').config()

const express = require('express')
const app = express()
// app.use(express.json())

const cors = require('cors')
app.use(cors({
    origin: "https://pobl.powerappsportals.com",
}))

const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY)
const nodemailer = require('nodemailer');

const processEmail = () => {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'rich.griffiths89@gmail.com',
            pass: 'griffiths01'
        }
    });
      
    let mailOptions = {
        from: 'rich.griffiths89@gmail.com',
        to: 'richard.griffiths1@poblgroup.co.uk',
        subject: 'New Payment Created',
        text: 'Testing Email'
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
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

    //const eventType = req.body.type;

    // Ensure call is from stripe
    const payload = req.body
    const sig = req.headers['stripe-signature']
    const endpointSecret = 'whsec_RrWqnwDN8p3SQM4hQXIWbyIHNeFo3fU0'

    let event;

    try {
        event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.created':
            console.log("PAYMENT CREATED")
            // const paymentCreated = event.data.object;
            // Then define and call a function to handle the event payment_intent.created
            // processEmail();
            break;
        case 'payment_intent.succeeded':
            console.log('PAYMENT SUCCEEDED');
            // const paymentSucceeded = event.data.object;
            // Then define and call a function to handle the event payment_intent.succeeded
            break;
        default:
            console.log("Unhandled event type");
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send();
})
    
app.listen(process.env.PORT || 3000)