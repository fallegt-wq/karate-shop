import Stripe from "stripe";

const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export default stripe;
