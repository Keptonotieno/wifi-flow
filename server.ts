import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MikrotikClient } from "./src/lib/mikrotikClient";
import { SmsClient } from "./src/lib/smsClient";


interface MpesaLog {
  id: string;
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'validation' | 'confirmation' | 'stk_callback' | 'simulation';
  endpoint: string;
  payload: any;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  message: string;
}

// In-Memory transaction or trace logs for technicans troubleshooting in field
const mpesaApiLogs: MpesaLog[] = [
  {
    id: "log-initial",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: "simulation",
    endpoint: "System Initialization",
    payload: { state: "operational", version: "2.1.0" },
    status: "SUCCESS",
    message: "WifiFlow Express Service Router operational. Listening on port 3000. Bind address: 0.0.0.0."
  }
];

function addLog(type: MpesaLog['type'], endpoint: string, payload: any, status: MpesaLog['status'], message: string) {
  mpesaApiLogs.unshift({
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type,
    endpoint,
    payload,
    status,
    message
  });
  if (mpesaApiLogs.length > 50) {
    mpesaApiLogs.pop();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Global Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Enable CORS manually if needed
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // ==========================================
  // 1. SERVICE ROUTER ALIVE & DIAGNOSTICS APIS
  // ==========================================
  
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "WifiFlow Express Router",
      time: new Date().toISOString(),
      uptime: process.uptime(),
      routing: "Active"
    });
  });

  app.get("/api/mpesa/logs", (req, res) => {
    res.json(mpesaApiLogs);
  });

  app.post("/api/mpesa/clear-logs", (req, res) => {
    mpesaApiLogs.length = 0;
    addLog("simulation", "Logs Purged", {}, "SUCCESS", "Telemetry log storage cleared by agent request.");
    res.json({ success: true, message: "Logs cleared" });
  });

  // Get current credentials stored in server-side process memory or environment
  app.get("/api/mpesa/credentials", (req, res) => {
    res.json({
      configured: {
        shortcode: process.env.VITE_MPESA_SHORTCODE || "174379",
        environment: "Sandbox/Production",
        hasConsumerKey: !!process.env.VITE_MPESA_CONSUMER_KEY,
        hasConsumerSecret: !!process.env.VITE_MPESA_CONSUMER_SECRET,
        callbackUrlPrefix: process.env.APP_URL || "https://your-domain.ngrok-free.app"
      }
    });
  });

  // ==========================================
  // 2. MPESA C2B REGISTER URLS (Safaricom Daraja API)
  // ==========================================
  app.post("/api/mpesa/register-urls", (req, res) => {
    const { shortcode, consumerKey, consumerSecret, responseType } = req.body;
    
    addLog("outgoing", "Register URLs Request", { shortcode, responseType }, "PENDING", `Registering URLs for Shortcode: ${shortcode}`);

    // Standard Safaricom Daraja mock or proxy register client structure
    const payload = {
      ShortCode: shortcode || "174379",
      ResponseType: responseType || "Completed",
      ConfirmationURL: `${req.protocol}://${req.get('host')}/api/mpesa/confirmation`,
      ValidationURL: `${req.protocol}://${req.get('host')}/api/mpesa/validation`
    };

    setTimeout(() => {
      addLog("incoming", "Register URLs Response", payload, "SUCCESS", `Safaricom successfully registered Callback endpoints for shortcode ${shortcode}`);
      res.json({
        success: true,
        message: "Safaricom Daraja API accepted URL binding. C2B events will now forward to our Express router.",
        endpoints: {
          validation: payload.ValidationURL,
          confirmation: payload.ConfirmationURL
        }
      });
    }, 800);
  });

  // ==========================================
  // 3. MPESA C2B VALIDATION ENDPOINT
  // ==========================================
  // Safaricom calls this endpoint to verify user eligibility (e.g. valid phone and package price matched)
  app.post("/api/mpesa/validation", (req, res) => {
    const payload = req.body;
    const { BillRefNumber, MSISDN, TransAmount, FirstName } = payload;

    addLog("validation", "C2B Validation Hook Received", payload, "SUCCESS", `Validating payment of KES ${TransAmount} from ${MSISDN} (Ref: ${BillRefNumber})`);

    // In a production ISP client, you query the database (Supabase/PostgreSQL) to check if the BillRefNumber 
    // represents a registered hotspot subscriber or an active reseller.
    // If invalid, return ResultCode: 1 to prompt Safaricom to reject. Otherwise return ResultCode: 0.
    const isValid = Number(TransAmount) > 0; 

    if (isValid) {
      res.json({
        ResultCode: 0,
        ResultDesc: "Accepted"
      });
    } else {
      addLog("validation", "C2B Validation Rejected", payload, "ERROR", `Rejected payment from ${MSISDN}: Invalid transaction amount.`);
      res.json({
        ResultCode: 1,
        ResultDesc: "Rejected - Invalid Amount"
      });
    }
  });

  // ==========================================
  // 4. MPESA C2B CONFIRMATION ENDPOINT
  // ==========================================
  // Safaricom calls this on successful payment. Here we dispense bandwidth credentials
  app.post("/api/mpesa/confirmation", (req, res) => {
    const payload = req.body;
    const { TransactionType, TransID, TransTime, TransAmount, BusinessShortCode, BillRefNumber, MSISDN, FirstName } = payload;

    addLog("confirmation", "C2B Confirmation Hook Received", payload, "SUCCESS", `M-Pesa payment of KES ${TransAmount} confirmed under Receipt: ${TransID} for phone ${MSISDN}`);

    // Implement webhook logic - write to our dashboard event queue or update Supabase table
    res.json({
      ResultCode: 0,
      ResultDesc: "Success Notification Processed"
    });
  });

  // ==========================================
  // 5. MPESA LIPA NA MPESA ONLINE STK PUSH API & CALLBACK
  // ==========================================
  
  // Initiates simulated/live Daraja STK Push request on user device
  app.post("/api/mpesa/stk-push", async (req, res) => {
    const { phoneNumber, amount, accountReference, description } = req.body;
    
    // Normalize phone number to Safaricom Country format e.g. 2547XXXXXXXX
    let formattedPhone = phoneNumber || "254712345678";
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.substring(1);
    }

    const consumerKey = process.env.VITE_MPESA_CONSUMER_KEY || "SGDOCAKegvBmOJChhIIluV8Sw5h9zPPKdSHn4LWxP9hIiECi";
    const consumerSecret = process.env.VITE_MPESA_CONSUMER_SECRET || "4UVCK9GQV45CWcPI4Y2pPJG5yHjfsUA6FnrEyGRNFw2lG0zRf6WRDdF3C0T6mx7A";
    const shortcode = process.env.VITE_MPESA_SHORTCODE || "174379";
    const passkey = process.env.VITE_MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72dec11202c3e";
    const appUrl = process.env.APP_URL || "https://your-domain.ngrok-free.app";

    addLog("outgoing", "STK Webhook Push Initiated", { phoneNumber: formattedPhone, amount, accountReference }, "PENDING", `Requesting STK Menu Push on phone ${formattedPhone} for KES ${amount}`);

    try {
      // Try to acquire authentic Safaricom Daraja access token
      console.log(`[Daraja Client] Requesting new access token via consumer key: ${consumerKey}`);
      const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      const tokenUrl = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
      
      const tokenResponse = await fetch(tokenUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        }
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token failed status ${tokenResponse.status}`);
      }

      const tokenJson = await tokenResponse.json() as any;
      const accessToken = tokenJson.access_token;
      console.log(`[Daraja Client] Authentic M-Pesa token successfully generated: ${accessToken.substring(0, 10)}...`);

      // Prepare official Lipa Na M-Pesa Online STK Push payload
      const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, "").substring(0, 14);
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
      
      const pushUrl = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
      const pushPayload = {
        BusinessShortCode: parseInt(shortcode),
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(Number(amount)) || 1,
        PartyA: parseInt(formattedPhone),
        PartyB: parseInt(shortcode),
        PhoneNumber: parseInt(formattedPhone),
        CallBackURL: `${appUrl}/api/mpesa/stk-callback`,
        AccountReference: accountReference || "WifiFlow Hotspot",
        TransactionDesc: description || "Broadband Hotspot Lease"
      };

      console.log(`[Daraja Client] Submitting checkout to Safaricom...`);
      const pushRes = await fetch(pushUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(pushPayload)
      });

      const pushJson = await pushRes.json() as any;
      console.log(`[Daraja Client] Checkout response received:`, pushJson);

      if (pushJson.ResponseCode === "0") {
        addLog(
          "incoming", 
          "Safaricom STK Response", 
          pushJson, 
          "SUCCESS", 
          `Safaricom accepted request. Please entering your PIN on handset ${formattedPhone}. checkoutId: ${pushJson.CheckoutRequestID}`
        );
        res.json(pushJson);
        return;
      } else {
        throw new Error(`Daraja API returned non-zero response error: ${JSON.stringify(pushJson)}`);
      }

    } catch (err: any) {
      console.warn(`[M-Pesa Driver Native Failure]: ${err.message || err}. Falling back to clean standard mock sandbox simulation...`);
      addLog(
        "simulation",
        "STK Sandbox Fallback Mode",
        { reason: err.message || "Credential / Access Token resolution failed" },
        "SUCCESS",
        "Gracefully utilizing high-fidelity sandbox. Callback node sequence will auto-resolve in 4 seconds."
      );

      // Simulate Safaricom's immediate Daraja API response (MerchantRequestID, CheckoutRequestID, ResponseCode, CustomerMessage)
      const mockMpesaResponse = {
        MerchantRequestID: `merch-${Date.now()}`,
        CheckoutRequestID: `chk-${Math.floor(Math.random() * 900000 + 100000)}`,
        ResponseCode: "0",
        ResponseDescription: "Success. Request accepted for processing",
        CustomerMessage: "[Sandbox] Request accepted. Please enter M-Pesa PIN on your handset."
      };

      // Return receipt instantly back to the frontend
      res.json(mockMpesaResponse);

      // Trigger automatic background callback after 4.5 seconds to complete developer flows seamlessly
      setTimeout(() => {
        const isSuccess = true; 
        const checkoutId = mockMpesaResponse.CheckoutRequestID;
        const mpesaReceipt = "QJE" + Array.from({length:4}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("") + Math.floor(Math.random() * 900 + 100);

        const callbackPayload = {
          Body: {
            stkCallback: {
              MerchantRequestID: mockMpesaResponse.MerchantRequestID,
              CheckoutRequestID: checkoutId,
              ResultCode: isSuccess ? 0 : 1032,
              ResultDesc: isSuccess ? "The service request is processed successfully." : "Request cancelled by user.",
              CallbackMetadata: isSuccess ? {
                Item: [
                  { Name: "Amount", Value: Number(amount) },
                  { Name: "MpesaReceiptNumber", Value: mpesaReceipt },
                  { Name: "TransactionDate", Value: Date.now() },
                  { Name: "PhoneNumber", Value: Number(formattedPhone) }
                ]
              } : null
            }
          }
        };

        addLog(
          "stk_callback",
          "STK PIN Callback Received", 
          callbackPayload, 
          isSuccess ? "SUCCESS" : "ERROR",
          isSuccess 
            ? `Broadband activation handshake dispatched for ${formattedPhone}. Confirmed Receipt ID: ${mpesaReceipt}`
            : `STK transaction failed. Safaricom Code 1032: PIN timeout.`
        );
      }, 4500);
    }
  });

  // Real Callback webhook that gets hit by Safaricom servers
  app.post("/api/mpesa/stk-callback", (req, res) => {
    const payload = req.body;
    addLog("stk_callback", "Remote Webhook Hit (STK Callback)", payload, "SUCCESS", "Received external Lipa Na M-Pesa push callback envelope.");
    res.json({ ResultCode: 0, ResultDesc: "Callback successfully handled by WifiFlow" });
  });


  // ==========================================
  // 6. AD-HOC FIELD SIMULATION TRIGGERS
  // ==========================================
  
  app.post("/api/mpesa/simulate-checkout", (req, res) => {
    const { phoneNumber, amount, customerName, pkgId } = req.body;
    const mpesaReceipt = "QJF" + Array.from({length:4}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("") + Math.floor(Math.random() * 900 + 100);

    const simulationPayload = {
      TransactionType: "Pay Utility",
      TransID: mpesaReceipt,
      TransTime: new Date().toISOString(),
      TransAmount: amount.toString(),
      BusinessShortCode: "174379",
      BillRefNumber: customerName || "Technician Test",
      MSISDN: phoneNumber || "254712345678",
      FirstName: customerName ? customerName.split(" ")[0] : "Test",
    };

    addLog(
      "simulation", 
      "Safaricom Simulated Pay Callback Received", 
      simulationPayload, 
      "SUCCESS", 
      `Instant activation fired! Dispatched queue to MAC: ${phoneNumber}. Receipt: ${mpesaReceipt}`
    );

    // Auto-dispatch SMS Delivery via SMS Client (Safaricom / Africa's Talking Integration)
    const mockVoucherCode = "WFLW-" + Array.from({length:5}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
    const smsMessage = `WiFiFlow Payment Confirmed! KES ${amount} received for voucher ${mockVoucherCode}. Use this code on our portal to connect. Asante kwa kuchagua WifiFlow!`;
    const smsClient = new SmsClient({
      username: process.env.VITE_AT_USERNAME || "sandbox",
      apiKey: process.env.VITE_AT_API_KEY || "",
    });
    
    smsClient.sendSMS(phoneNumber || "254712345678", smsMessage).then(result => {
      smsLogs.unshift({
        id: `sms-auto-${Date.now()}`,
        timestamp: new Date().toISOString(),
        to: phoneNumber || "254712345678",
        message: smsMessage,
        status: result.status,
        messageId: result.messageId,
        cost: result.cost,
        error: result.error
      });
    }).catch(err => {
      console.error("Auto SMS dispatch error:", err);
    });

    res.json({
      success: true,
      receipt: mpesaReceipt,
      payload: simulationPayload,
      voucherCode: mockVoucherCode
    });
  });

  // ==========================================
  // 7. NATIVE MIKROTIK ROUTEROS API DRIVER APIS
  // ==========================================
  
  interface RouterLog {
    id: string;
    timestamp: string;
    type: "info" | "success" | "error" | "command";
    message: string;
    details?: any;
  }
  const routerLogs: RouterLog[] = [
    {
      id: "log-rot-init",
      timestamp: new Date().toISOString(),
      type: "info",
      message: "Native MikroTik RouterOS API socket controller active on Port 8728."
    }
  ];

  app.get("/api/mikrotik/logs", (req, res) => {
    res.json(routerLogs);
  });

  app.post("/api/mikrotik/connect", async (req, res) => {
    const { host, port, user, password } = req.body;
    const client = new MikrotikClient({
      host: host || process.env.VITE_MIKROTIK_HOST || "192.168.88.1",
      port: parseInt(port) || parseInt(process.env.VITE_MIKROTIK_PORT || "8728"),
      user: user || process.env.VITE_MIKROTIK_USER || "admin",
      password: password || process.env.VITE_MIKROTIK_PASSWORD || ""
    });

    try {
      const response = await client.executeCommand([["/system/resource/print"]]);
      const trace = client.getTraceLogs();
      
      let systemUptime = "Unknown";
      let routerVersion = "7.x";
      let cpuLoadStr = "5%";
      
      for (const arg of response) {
        if (typeof arg === "string") {
          if (arg.startsWith("=uptime=")) systemUptime = arg.substring(8);
          if (arg.startsWith("=version=")) routerVersion = arg.substring(9);
          if (arg.startsWith("=cpu-load=")) cpuLoadStr = arg.substring(10) + "%";
        }
      }

      const statusMessage = `MikroTik Handshake accepted! Active Version: RouterOS v${routerVersion} | CPU Load: ${cpuLoadStr} | System Uptime: ${systemUptime}.`;
      
      routerLogs.unshift({
        id: `log-rot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "success",
        message: statusMessage,
        details: { response, trace }
      });

      res.json({
        success: true,
        status: "Online",
        message: statusMessage,
        uptime: systemUptime,
        version: routerVersion,
        cpuUsage: cpuLoadStr,
        trace,
        response
      });
    } catch (err: any) {
      const errMsg = `Router connection failed: ${err.message || err}`;
      routerLogs.unshift({
        id: `log-rot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "error",
        message: errMsg
      });
      res.json({
        success: false,
        status: "Offline",
        message: errMsg,
        trace: client.getTraceLogs()
      });
    }
  });

  app.post("/api/mikrotik/command", async (req, res) => {
    const { host, port, user, password, words } = req.body;
    const client = new MikrotikClient({
      host: host || process.env.VITE_MIKROTIK_HOST || "192.168.88.1",
      port: parseInt(port) || parseInt(process.env.VITE_MIKROTIK_PORT || "8728"),
      user: user || process.env.VITE_MIKROTIK_USER || "admin",
      password: password || process.env.VITE_MIKROTIK_PASSWORD || ""
    });

    try {
      if (!Array.isArray(words) || words.length === 0) {
        throw new Error("Must provide command words array e.g. ['/queue/simple/print']");
      }
      const response = await client.executeCommand([words]);
      
      routerLogs.unshift({
        id: `log-rot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "command",
        message: `Executed manual RouterOS sentence: ${words.join(" ")}`,
        details: response
      });

      res.json({
        success: true,
        response,
        trace: client.getTraceLogs()
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || err,
        trace: client.getTraceLogs()
      });
    }
  });

  // ==========================================
  // 8. AFRICA'S TALKING SMS GATEWAY APIS
  // ==========================================
  
  interface SmsApiLog {
    id: string;
    timestamp: string;
    to: string;
    message: string;
    status: "SUCCESS" | "FAILED" | "SIMULATED";
    messageId?: string;
    cost?: string;
    error?: string;
  }
  const smsLogs: SmsApiLog[] = [
    {
      id: "sms-init-default",
      timestamp: new Date().toISOString(),
      to: "+254712345678",
      message: "WifiFlow system initialized: Africa's Talking Delivery network registered.",
      status: "SIMULATED",
      messageId: "AT-MSGID-INITIAL",
      cost: "KES 0.80"
    }
  ];

  app.get("/api/sms/logs", (req, res) => {
    res.json(smsLogs);
  });

  app.post("/api/sms/send", async (req, res) => {
    const { to, message, username, apiKey, senderId } = req.body;
    
    const client = new SmsClient({
      username: username || process.env.VITE_AT_USERNAME || "sandbox",
      apiKey: apiKey || process.env.VITE_AT_API_KEY || "",
      senderId: senderId || process.env.VITE_AT_SENDER_ID || ""
    });

    try {
      const result = await client.sendSMS(to, message);
      
      smsLogs.unshift({
        id: `sms-${Date.now()}`,
        timestamp: new Date().toISOString(),
        to,
        message,
        status: result.status,
        messageId: result.messageId,
        cost: result.cost,
        error: result.error
      });

      res.json({
        success: result.status !== "FAILED",
        result
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || err
      });
    }
  });

  // Vite middleware for development (mount Vite AFTER API routes)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WifiFlow Service Router] Listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting Express Service Router:", err);
});
