require("dotenv").config();
const CoinbasePro = require("coinbase-pro");
const Decimal = require("decimal.js");

const key = process.env.API_KEY;
const secret = process.env.SECRET;
const passphrase = process.env.PASSPHRASE;

const apiURI = "https://api.pro.coinbase.com";
const sandboxURI = "https://api-public.sandbox.pro.coinbase.com";

const authedClient = new CoinbasePro.AuthenticatedClient(
  key,
  secret,
  passphrase,
  apiURI
);

const getPaymentMethod = () => {
  return new Promise((resolve) => {
    authedClient.getPaymentMethods((accounts, req, c) => {
      resolve(c[0]);
    });
  });
};

const depositPayment = (amount, payment_method_id) => {
  return new Promise((resolve, reject) => {
    authedClient.depositPayment(
      {
        amount,
        currency: "EUR",
        payment_method_id,
      },
      (a, req, c) => {
        console.log({ a, c });
        reject();
      }
    );
  });
};

const placeOrder = (params) => {
  return new Promise((resolve) => {
    authedClient.placeOrder(params, (a, req, c) => {
      console.log({
        a,
        c,
      });
    });
  });
};

const map = {
  btc: "BTC-EUR",
};
// authedClient.getProductHistoricRates("BTC-EUR", (a, req, b) => {
//   console.log({ a, b });
// });
const init = async () => {
  const paymentMethod = await getPaymentMethod();

  //   const params = {
  //     side: "buy",
  //     price: "5.00",
  //     size: "1",
  //     product_id: "BTC-EUR",
  //   };

  const budget = 5;

  const {
    bid,
    ask,
    price,
    size,
    trade_id,
  } = await authedClient.getProductTicker(btc);

  const btcPrice = 1 / Decimal(price);

  const params = {
    side: "buy",
    price: Decimal(budget).toFixed(2) + "",
    size: Decimal(btcPrice * budget).toFixed(8) + "",
    product_id: btc,
  };

  console.log({ params });
  const response = await authedClient.placeOrder(params);
  console.log(response);
  //   await depositPayment("1.00", paymentMethod.id);
};

init();
