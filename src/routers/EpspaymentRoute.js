const express = require("express");
const EpsPaymentService = require("../services/EpsPaymentService");
const EpsTransaction = require("../models/Epstranscation");

const router = express.Router();

/* ==========================================================
   INITIATE PAYMENT
   ফ্রন্টএন্ড থেকে POST কল করবে: order, shipping, cartItems পাঠিয়ে
   ========================================================== */
router.post("/payment/eps/initiate", async (req, res) => {
  try {
    const { order, shipping, cartItems } = req.body;

    if (!order?.invoice_id || !order?.amount) {
      return res.status(400).json({
        success: false,
        message: "order.invoice_id and order.amount are required",
      });
    }

    if (!shipping?.name || !shipping?.phone) {
      return res.status(400).json({
        success: false,
        message: "shipping.name and shipping.phone are required",
      });
    }

    // 🔹 unique merchant transaction id generate করা হচ্ছে
    const merchantTransactionId = `TXN-${order.invoice_id}-${Date.now()}`;

    // 🔹 Step 1: Token নাও
    const { token, error: tokenError } = await EpsPaymentService.getToken();

    if (!token) {
      return res.status(502).json({
        success: false,
        message: "Failed to get EPS token",
        error: tokenError,
      });
    }

    // 🔹 Step 2: Payment initialize করো
    const { data: initData, error: initError } = await EpsPaymentService.initializePayment(
      token,
      merchantTransactionId,
      order,
      shipping,
      cartItems || [],
      req
    );

    if (!initData) {
      // 🔹 fail হলেও DB তে log রাখো
      await EpsTransaction.create({
        invoiceId: order.invoice_id,
        merchantTransactionId,
        amount: order.amount,
        customerName: shipping.name,
        customerEmail: shipping.email,
        customerPhone: shipping.phone,
        customerAddress: shipping.address,
        cartItems: cartItems || [],
        status: "failed",
        errorMessage: initError,
      });

      return res.status(502).json({
        success: false,
        message: "Failed to initialize EPS payment",
        error: initError,
      });
    }

    // 🔹 DB তে transaction record save করো
    await EpsTransaction.create({
      invoiceId: order.invoice_id,
      merchantTransactionId,
      epsTransactionId: initData.transaction_id,
      amount: order.amount,
      customerName: shipping.name,
      customerEmail: shipping.email,
      customerPhone: shipping.phone,
      customerAddress: shipping.address,
      cartItems: cartItems || [],
      redirectUrl: initData.redirect_url,
      status: "initiated",
    });

    return res.status(200).json({
      success: true,
      redirect_url: initData.redirect_url,
      transaction_id: initData.transaction_id,
      merchantTransactionId,
    });
  } catch (err) {
    console.error("❌ EPS Initiate Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error while initiating EPS payment",
      error: err.message,
    });
  }
});

/* ==========================================================
   SUCCESS CALLBACK
   EPS gateway এই URL এ redirect করবে payment success হলে
   EPS আসলে পাঠায়: Status, MerchantTransactionId, EPSTransactionId, ErrorCode
   (lowercase merchantTransactionId না — এটাই এতদিন বাগ ছিল)
   ========================================================== */
router.get("/payment/eps/success", async (req, res) => {
  try {
    // 🔹 EPS বিভিন্ন casing পাঠাতে পারে, তাই সব variant চেক করছি — safe approach
    const merchantTransactionId =
      req.query.MerchantTransactionId || req.query.merchantTransactionId;
    const epsTransactionId =
      req.query.EPSTransactionId || req.query.epsTransactionId;
    const gatewayStatus = req.query.Status || req.query.status;

    if (!merchantTransactionId && !epsTransactionId) {
      return res.status(400).send("Missing transaction identifier");
    }

    const transaction = await EpsTransaction.findOne(
      merchantTransactionId
        ? { merchantTransactionId }
        : { epsTransactionId }
    );

    if (!transaction) {
      return res.status(404).send("Transaction not found");
    }

    // 🔹 Token নিয়ে verify করো
    const { token, error: tokenError } = await EpsPaymentService.getToken();

    if (!token) {
      return res.status(502).send(`Verification token error: ${tokenError}`);
    }

    const { data: verifyData, error: verifyError } = await EpsPaymentService.verifyTransaction(
      token,
      transaction.merchantTransactionId,
      transaction.epsTransactionId || epsTransactionId
    );

    if (!verifyData) {
      transaction.status = "failed";
      transaction.errorMessage = verifyError;
      await transaction.save();

      return renderFailPage(res, transaction.invoiceId, "আমরা আপনার পেমেন্ট ভেরিফাই করতে পারিনি।");
    }

    // 🔹 EPS verify response অনুযায়ী success check করো
    const isSuccess =
      verifyData?.TransactionStatus === "Success" ||
      verifyData?.transactionStatus === "Success" ||
      verifyData?.Status === "Success" ||
      gatewayStatus === "Success";

    transaction.verificationResponse = verifyData;
    transaction.status = isSuccess ? "success" : "failed";
    if (epsTransactionId && !transaction.epsTransactionId) {
      transaction.epsTransactionId = epsTransactionId;
    }
    await transaction.save();

    if (!isSuccess) {
      return renderFailPage(res, transaction.invoiceId, "আপনার পেমেন্টটি সম্পন্ন হয়নি।");
    }

    // ✅ Payment successful — order status "paid" করার লজিক এখানে বসাও
    // await Order.findOneAndUpdate({ invoice_id: transaction.invoiceId }, { paymentStatus: "paid" });

    const invoiceId = transaction.invoiceId;
    const trxId = transaction.merchantTransactionId;
    const epsTrxId = transaction.epsTransactionId || "N/A";
    const amount = transaction.amount;
    const customerName = transaction.customerName || "N/A";
    const customerPhone = transaction.customerPhone || "N/A";
    const customerEmail = transaction.customerEmail || "N/A";
    const customerAddress = transaction.customerAddress || "N/A";
    const paidAt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Payment Successful | KroyMall</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
        body {
          background: #f4f6f9;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .card {
          background: #fff;
          max-width: 520px;
          width: 100%;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #16a34a, #22c55e);
          color: #fff;
          text-align: center;
          padding: 36px 24px;
        }
        .header .icon {
          width: 70px;
          height: 70px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          font-size: 36px;
        }
        .header h1 { font-size: 22px; margin-bottom: 6px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .body { padding: 26px 28px; }
        .amount {
          text-align: center;
          margin-bottom: 22px;
        }
        .amount .label { color: #6b7280; font-size: 13px; margin-bottom: 4px; }
        .amount .value { font-size: 30px; font-weight: 700; color: #111827; }
        .divider { border-top: 1px dashed #e5e7eb; margin: 18px 0; }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .row .key { color: #6b7280; }
        .row .val { color: #111827; font-weight: 600; text-align: right; max-width: 60%; word-break: break-word; }
        .footer {
          padding: 22px 28px 30px;
          text-align: center;
        }
        .btn {
          display: inline-block;
          text-decoration: none;
          background: #111827;
          color: #fff;
          padding: 12px 28px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          margin-top: 4px;
        }
        .note {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 14px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="icon">✔</div>
          <h1>Payment Successful</h1>
          <p>Thank you for your purchase from KroyMall</p>
        </div>
        <div class="body">
          <div class="amount">
            <div class="label">Amount Paid</div>
            <div class="value">৳ ${amount}</div>
          </div>
          <div class="divider"></div>
          <div class="row"><span class="key">Invoice ID</span><span class="val">${invoiceId}</span></div>
          <div class="row"><span class="key">Transaction ID</span><span class="val">${trxId}</span></div>
          <div class="row"><span class="key">EPS Transaction ID</span><span class="val">${epsTrxId}</span></div>
          <div class="row"><span class="key">Paid At</span><span class="val">${paidAt}</span></div>
          <div class="divider"></div>
          <div class="row"><span class="key">Customer Name</span><span class="val">${customerName}</span></div>
          <div class="row"><span class="key">Phone</span><span class="val">${customerPhone}</span></div>
          <div class="row"><span class="key">Email</span><span class="val">${customerEmail}</span></div>
          <div class="row"><span class="key">Address</span><span class="val">${customerAddress}</span></div>
        </div>
        <div class="footer">
          <a class="btn" href="https://alabadanbackendpart.alabadan.com">Continue Shopping</a>
          <div class="note">A confirmation has been recorded against invoice #${invoiceId}</div>
        </div>
      </div>
    </body>
    </html>
    `;

    return res.status(200).send(html);
  } catch (err) {
    console.error("❌ EPS Success Callback Error:", err.message);
    return res.status(500).send("Payment verification failed");
  }
});

/* ==========================================================
   FAIL CALLBACK
   ========================================================== */
router.get("/payment/eps/fail", async (req, res) => {
  try {
    const merchantTransactionId =
      req.query.MerchantTransactionId || req.query.merchantTransactionId;
    const epsTransactionId =
      req.query.EPSTransactionId || req.query.epsTransactionId;

    let invoiceId = "N/A";

    if (merchantTransactionId || epsTransactionId) {
      const transaction = await EpsTransaction.findOne(
        merchantTransactionId
          ? { merchantTransactionId }
          : { epsTransactionId }
      );

      if (transaction) {
        transaction.status = "failed";
        await transaction.save();
        invoiceId = transaction.invoiceId;
      }
    }

    return renderFailPage(res, invoiceId, "দুঃখিত, আপনার পেমেন্ট প্রসেস করা যায়নি।");
  } catch (err) {
    console.error("❌ EPS Fail Callback Error:", err.message);
    return res.status(500).send("Error handling failed payment");
  }
});

/* ==========================================================
   CANCEL CALLBACK
   ========================================================== */
router.get("/payment/eps/cancel", async (req, res) => {
  try {
    const merchantTransactionId =
      req.query.MerchantTransactionId || req.query.merchantTransactionId;
    const epsTransactionId =
      req.query.EPSTransactionId || req.query.epsTransactionId;

    let invoiceId = "N/A";

    if (merchantTransactionId || epsTransactionId) {
      const transaction = await EpsTransaction.findOne(
        merchantTransactionId
          ? { merchantTransactionId }
          : { epsTransactionId }
      );

      if (transaction) {
        transaction.status = "cancelled";
        await transaction.save();
        invoiceId = transaction.invoiceId;
      }
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Payment Cancelled | KroyMall</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
        body {
          background: #f4f6f9;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .card {
          background: #fff;
          max-width: 480px;
          width: 100%;
          border-radius: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          overflow: hidden;
          text-align: center;
        }
        .header {
          background: linear-gradient(135deg, #d97706, #f59e0b);
          color: #fff;
          padding: 36px 24px;
        }
        .header .icon {
          width: 70px;
          height: 70px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          font-size: 36px;
        }
        .header h1 { font-size: 22px; margin-bottom: 6px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .body { padding: 26px 28px; }
        .body p { color: #6b7280; font-size: 14px; margin-bottom: 6px; }
        .body .invoice { color: #111827; font-weight: 600; font-size: 15px; margin-bottom: 10px; }
        .footer { padding: 10px 28px 30px; }
        .btn {
          display: inline-block;
          text-decoration: none;
          background: #111827;
          color: #fff;
          padding: 12px 28px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="icon">!</div>
          <h1>Payment Cancelled</h1>
          <p>আপনি পেমেন্টটি বাতিল করেছেন</p>
        </div>
        <div class="body">
          <p>আপনার অর্ডারটি এখনো পেন্ডিং রয়েছে।</p>
          <div class="invoice">Invoice ID: ${invoiceId}</div>
          <p>পুনরায় পেমেন্ট সম্পন্ন করতে নিচের বাটনে ক্লিক করুন।</p>
        </div>
        <div class="footer">
          <a class="btn" href="https://alabadanbackendpart.alabadan.com">আবার চেষ্টা করুন</a>
        </div>
      </div>
    </body>
    </html>
    `;

    return res.status(200).send(html);
  } catch (err) {
    console.error("❌ EPS Cancel Callback Error:", err.message);
    return res.status(500).send("Error handling cancelled payment");
  }
});

/* ==========================================================
   Helper — Fail page renderer (success আর fail route দুই জায়গায় লাগে)
   ========================================================== */
function renderFailPage(res, invoiceId, message) {
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Payment Failed | KroyMall</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
      body {
        background: #f4f6f9;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
      }
      .card {
        background: #fff;
        max-width: 480px;
        width: 100%;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        overflow: hidden;
        text-align: center;
      }
      .header {
        background: linear-gradient(135deg, #dc2626, #ef4444);
        color: #fff;
        padding: 36px 24px;
      }
      .header .icon {
        width: 70px;
        height: 70px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 14px;
        font-size: 36px;
      }
      .header h1 { font-size: 22px; margin-bottom: 6px; }
      .header p { font-size: 14px; opacity: 0.9; }
      .body { padding: 26px 28px; }
      .body p { color: #6b7280; font-size: 14px; margin-bottom: 6px; }
      .body .invoice { color: #111827; font-weight: 600; font-size: 15px; margin-bottom: 10px; }
      .footer { padding: 10px 28px 30px; }
      .btn {
        display: inline-block;
        text-decoration: none;
        background: #111827;
        color: #fff;
        padding: 12px 28px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="icon">✕</div>
        <h1>Payment Failed</h1>
        <p>আপনার পেমেন্টটি সম্পন্ন হয়নি</p>
      </div>
      <div class="body">
        <p>${message}</p>
        <div class="invoice">Invoice ID: ${invoiceId}</div>
        <p>টাকা কাটা থাকলে ব্যাংক/মোবাইল ব্যাংকিং থেকে তা রিফান্ড হয়ে যাবে, অথবা আমাদের সাপোর্টে যোগাযোগ করুন।</p>
      </div>
      <div class="footer">
        <a class="btn" href="https://alabadanbackendpart.alabadan.com">আবার চেষ্টা করুন</a>
      </div>
    </div>
  </body>
  </html>
  `;
  return res.status(200).send(html);
}

module.exports = router;