import { NowRequest, NowResponse } from "@vercel/node";
import CoinbasePro from "coinbase-pro";
import invariant from "invariant";
import { Decimal } from "decimal.js";

const key = process.env.API_KEY;
const secret = process.env.SECRET;

const apiURI = "https://api.pro.coinbase.com";

type PaymentMethod = any;
declare module "coinbase-pro" {
  export interface AuthenticatedClient {
    getPaymentMethods: () => PaymentMethod[];
  }
}

const cryptoMap = {
  btc: "BTC-EUR",
};

const purchase = async ({ crypto, passphrase, amount }) => {
  if (amount > 300) {
    throw new Error("Buy for less!");
  }

  const client = new CoinbasePro.AuthenticatedClient(
    key,
    secret,
    passphrase,
    apiURI
  );
  const { price } = await client.getProductTicker(crypto);

  const btcPrice = new Decimal(1).dividedBy(new Decimal(price));

  const response = await client.placeOrder({
    side: "buy",
    price: new Decimal(amount).toFixed(2).toString(),
    size: btcPrice.times(amount).toFixed(8).toString(),
    product_id: crypto,
    type: "limit",
  });
};

export default async (req: NowRequest, res: NowResponse) => {
  try {
    invariant(req.method === "POST", "Only POST supported");
    invariant(typeof req.body?.passphrase === "string", "Missing passphrase");
    invariant(typeof req.body?.amount === "number", "Missing amount");
    invariant(cryptoMap[req.body?.crypto], "Did not find supported crypto");
  } catch (e) {
    return res.status(400).send(e.message);
  }

  try {
    await purchase({
      passphrase: req.body.passphrase,
      amount: req.body.amount,
      crypto: cryptoMap[req.body.crypto],
    });
    return res.status(200).send("Success");
  } catch (e) {
    console.error(e);
    return res.status(400).send(e.data.message);
  }
};
