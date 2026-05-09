import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
    const { items, billId } = req.body;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'blik'],
        line_items: items.map(item => ({
            price_data: {
                currency: 'pln',
                product_data: { name: item.name },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: `http://localhost:5173/?success=true&billId=${billId}`,
        cancel_url: `http://localhost:5173/?canceled=true`,
    });

    res.json({ url: session.url });
});

app.listen(4242, () => console.log('Serwer Stripe działa na porcie 4242'));