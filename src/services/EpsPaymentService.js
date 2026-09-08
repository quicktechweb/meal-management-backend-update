const axios = require("axios");
const crypto = require("crypto");

// ================= EPS CREDENTIALS =================
const EPS_CONFIG = {
  baseUrl: "https://pgapi.eps.com.bd/v1",
  merchantId: "ac5f05eb-8fc4-4b33-9a39-e8ded9be9c8e",
  storeId: "AF8C94D4-A8CD-406B-BD6D-B3DE9A01FE2E",
  username: "alabadanonline@gmail.com",
  password: "Merchant@123",
  hashKey: "FMUNISHOY2lWZEPSXTyB1D39ALABADAN",
  registeredDomain: "https://alabadan.com",
};

// ================= HASH GENERATOR (HMAC SHA512, base64) =================
const generateHash = (dataToSign) => {
  return crypto
    .createHmac("sha512", EPS_CONFIG.hashKey)
    .update(dataToSign)
    .digest("base64");
};

// ================= API No. 01 — GetToken =================
const getToken = async () => {
  try {
    const xHash = generateHash(EPS_CONFIG.username);

    const response = await axios.post(
      `${EPS_CONFIG.baseUrl}/Auth/GetToken`,
      {
        userName: EPS_CONFIG.username,
        password: EPS_CONFIG.password,
      },
      {
        headers: {
          "x-hash": xHash,
          Accept: "application/json",
        },
      }
    );

    const body = response.data;

    if (!body?.token) {
      console.error("❌ EPS GetToken missing token:", body);
      return { token: null, error: body?.errorMessage || "Token missing in EPS response." };
    }

    return { token: body.token, error: null };
  } catch (err) {
    console.error("❌ EPS GetToken failed:", err.response?.data || err.message);
    return {
      token: null,
      error: `GetToken HTTP Error ${err.response?.status || ""}: ${
        JSON.stringify(err.response?.data) || err.message
      }`,
    };
  }
};

// ================= API No. 02 — InitializeEPS =================
/**
 * @param {string} token - Bearer token from getToken()
 * @param {string} merchantTransactionId - unique transaction id
 * @param {object} order - { invoice_id, amount }
 * @param {object} shipping - { name, email, address, area, phone }
 * @param {array} cartItems - [{ name, qty, price }]
 * @param {object} req - express request object (for client IP + building absolute callback URLs)
 */
const initializePayment = async (token, merchantTransactionId, order, shipping, cartItems, req) => {
  try {
    const xHash = generateHash(merchantTransactionId);

    // 🔹 Sanitize client IP — fallback if local/invalid IP
    let clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip;

    const isValidIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(clientIp || "");
    if (!clientIp || !isValidIPv4 || clientIp === "127.0.0.1") {
      clientIp = "103.230.104.1";
    }

    const productList = cartItems.map((item) => ({
      ProductName: String(item.name),
      NoOfItem: String(item.qty),
      ProductProfile: "general",
      ProductCategory: "Ecommerce",
      ProductPrice: Number(item.price).toFixed(2),
    }));

    const domain = EPS_CONFIG.registeredDomain.replace(/\/$/, "");

    // 🔹 এই তিনটা callback route নিচে routes অংশে define করা আছে
   const successUrl = `${domain}/api/payment/eps/success`;
const failUrl = `${domain}/api/payment/eps/fail`;
const cancelUrl = `${domain}/api/payment/eps/cancel`;

    const body = {
      merchantId: EPS_CONFIG.merchantId,
      storeId: EPS_CONFIG.storeId,
      CustomerOrderId: String(order.invoice_id),
      merchantTransactionId,
      transactionTypeId: 1, // 1 = Web
      financialEntityId: 0,
      transitionStatusId: 0,
      totalAmount: Number(Number(order.amount).toFixed(2)),
      ipAddress: clientIp,
      version: "1",
      successUrl,
      failUrl,
      cancelUrl,
      customerName: shipping.name,
      customerEmail: shipping.email,
      customerAddress: shipping.address,
      customerAddress2: shipping.address,
      customerCity: shipping.area || "Dhaka",
      customerState: shipping.area || "Dhaka",
      customerPostcode: "1000",
      customerCountry: "BD",
      customerPhone: shipping.phone,
      shipmentName: shipping.name,
      shipmentAddress: shipping.address,
      shipmentAddress2: shipping.address,
      shipmentCity: shipping.area || "Dhaka",
      shipmentState: shipping.area || "Dhaka",
      shipmentPostcode: "1000",
      shipmentCountry: "BD",
      valueA: "",
      valueB: "",
      valueC: "",
      valueD: "",
      shippingMethod: "NO",
      noOfItem: String(cartItems.length),
      productName: cartItems.length ? cartItems[0].name : "Order",
      productProfile: "general",
      productCategory: "Ecommerce",
      ProductList: productList,
    };

    const response = await axios.post(
      `${EPS_CONFIG.baseUrl}/EPSEngine/InitializeEPS`,
      body,
      {
        headers: {
          "x-hash": xHash,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const responseBody = response.data;

    if (!responseBody || !responseBody.RedirectURL) {
      console.error("❌ EPS InitializeEPS response error:", responseBody);
      return {
        data: null,
        error: responseBody?.ErrorMessage || "Failed to retrieve redirect URL from EPS.",
      };
    }

    return {
      data: {
        transaction_id: responseBody.TransactionId || null,
        redirect_url: responseBody.RedirectURL,
      },
      error: null,
    };
  } catch (err) {
    console.error("❌ EPS InitializeEPS HTTP failure:", err.response?.data || err.message);
    return {
      data: null,
      error: `InitializeEPS HTTP Error ${err.response?.status || ""}: ${
        JSON.stringify(err.response?.data) || err.message
      }`,
    };
  }
};

// ================= API No. 03 — Verify Transaction =================
const verifyTransaction = async (token, merchantTransactionId = null, epsTransactionId = null) => {
  try {
    const hashSubject = merchantTransactionId || epsTransactionId;
    const xHash = generateHash(hashSubject);

    const params = {};
    if (merchantTransactionId) params.merchantTransactionId = merchantTransactionId;
    if (epsTransactionId) params.EPSTransactionId = epsTransactionId;

    const response = await axios.get(
      `${EPS_CONFIG.baseUrl}/EPSEngine/CheckMerchantTransactionStatus`,
      {
        params,
        headers: {
          "x-hash": xHash,
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    return { data: response.data, error: null };
  } catch (err) {
    console.error("❌ EPS CheckMerchantTransactionStatus failed:", err.response?.data || err.message);
    return {
      data: null,
      error: `Verify Transaction HTTP Error ${err.response?.status || ""}: ${
        JSON.stringify(err.response?.data) || err.message
      }`,
    };
  }
};

module.exports = {
  getToken,
  initializePayment,
  verifyTransaction,
};