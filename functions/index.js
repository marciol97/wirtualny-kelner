const { onRequest } = require("firebase-functions/v2/https");
const cors = require("cors")({ origin: true });

exports.createCheckoutSession = onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        try {
            const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

            const { items, billId } = req.body;

            const YOUR_DOMAIN = req.headers.origin;

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card", "blik"],
                line_items: items.map(item => ({
                    price_data: {
                        currency: "pln",
                        product_data: { name: item.name },
                        unit_amount: Math.round(item.price * 100),
                    },
                    quantity: item.quantity,
                })),
                mode: "payment",
                success_url: `${YOUR_DOMAIN}/?success=true&billId=${billId}`,
                cancel_url: `${YOUR_DOMAIN}/?canceled=true`,
            });

            res.json({ url: session.url });
        } catch (error) {
            console.error("Stripe Error:", error);
            res.status(500).send(error.message);
        }
    });
});