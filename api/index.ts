import { NowRequest, NowResponse } from '@vercel/node';
import CoinbasePro from 'coinbase-pro';
import invariant from 'invariant';
import axios from 'axios';

const key = process.env.API_KEY || '';
const secret = process.env.SECRET || '';
const slackUrl = process.env.SLACK_WEBHOOK_URL || '';

const apiURI = 'https://api.pro.coinbase.com';

type PaymentMethod = any;
declare module 'coinbase-pro' {
  export interface AuthenticatedClient {
    getPaymentMethods: () => PaymentMethod[];
  }
}

const postMessageToSlack = (text: string, markdown: any) => {
  const body = {
    text,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: text,
        },
      },
    ],
  };

  if (markdown) {
    body.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '```' + JSON.stringify(markdown) + '```',
      },
    });
  }

  return axios
    .post(slackUrl, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then((response) => {
      console.log('SUCCEEDED: Sent slack webhook: \n', response.data);
    })
    .catch((error) => {
      console.log('FAILED: Send slack webhook', error.message);
    });
};

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
  const order: any = {
    side: 'buy',
    funds: amount,
    product_id: crypto,
    type: 'market',
  };

  console.log(order);

  const response = await client.placeOrder(order);
  await postMessageToSlack(
    `✅ ✅ ✅ ✅ ✅  Purchased ${crypto} for ${amount}`,
    response
  );
  console.log(response);
};

export default async (req: NowRequest, res: NowResponse) => {
  console.log('query', req.query);
  const query: Record<string, string> = req.query as Record<string, string>;

  try {
    invariant(req.method === 'GET', 'Only GET supported');
    invariant(typeof query?.passphrase === 'string', 'Missing passphrase');
    invariant(query?.amount, 'Missing amount');
    invariant(cryptoMap[query?.crypto], 'Did not find supported crypto');
  } catch (e) {
    console.error(e.message);
    return res.status(400).send(e.message);
  }

  try {
    await purchase({
      passphrase: query.passphrase,
      amount:
        typeof query.amount === 'number'
          ? query.amount
          : parseInt(query.amount),
      crypto: cryptoMap[query.crypto],
    });
    return res.status(200).send('Success');
  } catch (e) {
    console.error(e);
    await postMessageToSlack(
      `❌ ❌ ❌ ❌ ❌ Failed buying ${cryptoMap[query?.crypto]} for ${
        query?.amount
      }`,
      e
    );
    return res.status(400).send(e?.data?.message || 'Error');
  }
};
