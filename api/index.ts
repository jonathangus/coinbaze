import { NowRequest, NowResponse } from '@vercel/node';
import CoinbasePro from 'coinbase-pro';
import invariant from 'invariant';

const key = process.env.API_KEY || '';
const secret = process.env.SECRET || '';

const apiURI = 'https://api.pro.coinbase.com';

type PaymentMethod = any;
declare module 'coinbase-pro' {
  export interface AuthenticatedClient {
    getPaymentMethods: () => PaymentMethod[];
  }
}

const cryptoMap: Record<string, string> = {
  btc: 'BTC-EUR',
  eth: 'ETH-EUR',
  ltc: 'LTC-EUR',
};

const purchase = async ({
  crypto,
  passphrase,
  amount,
}: {
  crypto: string;
  passphrase: string;
  amount: number;
}) => {
  if (amount > 300) {
    throw new Error('Buy for less!');
  }

  const client = new CoinbasePro.AuthenticatedClient(
    key,
    secret,
    passphrase,
    apiURI
  );
  const order = {
    side: 'buy',
    funds: amount,
    product_id: crypto,
    type: 'market',
  };

  console.log(order);
  const response = await client.placeOrder(order);
  console.log(response);
};

export default async (req: NowRequest, res: NowResponse) => {
  console.log('body', req.body);
  try {
    invariant(req.method === 'POST', 'Only POST supported');
    invariant(typeof req.body?.passphrase === 'string', 'Missing passphrase');
    invariant(req.body?.amount, 'Missing amount');
    invariant(cryptoMap[req.body?.crypto], 'Did not find supported crypto');
  } catch (e) {
    console.error(e.message);
    return res.status(400).send(e.message);
  }

  try {
    await purchase({
      passphrase: req.body.passphrase,
      amount:
        typeof req.body.amount === 'number'
          ? req.body.amount
          : parseInt(req.body.amount),
      crypto: cryptoMap[req.body.crypto],
    });
    return res.status(200).send('Success');
  } catch (e) {
    console.error(e);
    return res.status(400).send(e.data.message);
  }
};
