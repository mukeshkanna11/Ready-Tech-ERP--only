"use strict";

const { Resend } = require("resend");

const SUPPORT_EMAIL = "quries.readytechsolutions@gmail.com";

let resendClient = null;

/**
 * Get Resend client
 */
const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
};

/**
 * Escape HTML content
 */
const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Send ERP support chat email
 */
const sendSupportEmail = async ({
  name,
  email,
  phone = "",
  subject = "ERP Support",
  message,
  conversationId = "",
  leadId = "",
}) => {
  try {
    if (!name) {
      throw new Error("Customer name is required");
    }

    if (!email) {
      throw new Error("Customer email is required");
    }

    if (!message) {
      throw new Error("Support message is required");
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      throw new Error("RESEND_FROM_EMAIL is not configured");
    }

    const resend = getResendClient();

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone || "-");
    const safeSubject = escapeHtml(subject || "ERP Support");
    const safeMessage = escapeHtml(message);
    const safeConversationId = escapeHtml(conversationId || "-");
    const safeLeadId = escapeHtml(leadId || "-");

    const emailSubject = `New ERP Support Chat - ${
      subject || "Support Request"
    }`;

    const html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>ERP Support Request</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f3f4f6;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>

  <div
    style="
      width:100%;
      padding:40px 0;
      background:#f3f4f6;
    "
  >

    <div
      style="
        max-width:680px;
        margin:0 auto;
        background:#ffffff;
        border-radius:16px;
        overflow:hidden;
        border:1px solid #e5e7eb;
      "
    >

      <!-- HEADER -->

      <div
        style="
          background:#111827;
          padding:28px 30px;
          color:#ffffff;
        "
      >

        <div
          style="
            font-size:12px;
            text-transform:uppercase;
            letter-spacing:1px;
            color:#9ca3af;
            margin-bottom:8px;
          "
        >
          Ready Tech ERP
        </div>

        <h1
          style="
            margin:0;
            font-size:24px;
            line-height:1.3;
          "
        >
          New Support Chat
        </h1>

        <p
          style="
            margin:8px 0 0;
            color:#d1d5db;
            font-size:14px;
          "
        >
          A new support request was submitted from the ERP dashboard.
        </p>

      </div>


      <!-- CUSTOMER -->

      <div
        style="
          padding:30px;
        "
      >

        <h2
          style="
            margin:0 0 18px;
            font-size:18px;
            color:#111827;
          "
        >
          Customer Details
        </h2>


        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            border-collapse:collapse;
            font-size:14px;
          "
        >

          <tr>
            <td
              style="
                padding:10px 0;
                width:150px;
                color:#6b7280;
                font-weight:bold;
              "
            >
              Name
            </td>

            <td
              style="
                padding:10px 0;
                color:#111827;
              "
            >
              ${safeName}
            </td>
          </tr>


          <tr>
            <td
              style="
                padding:10px 0;
                color:#6b7280;
                font-weight:bold;
              "
            >
              Email
            </td>

            <td
              style="
                padding:10px 0;
              "
            >
              <a
                href="mailto:${safeEmail}"
                style="
                  color:#2563eb;
                  text-decoration:none;
                "
              >
                ${safeEmail}
              </a>
            </td>
          </tr>


          <tr>
            <td
              style="
                padding:10px 0;
                color:#6b7280;
                font-weight:bold;
              "
            >
              Phone
            </td>

            <td
              style="
                padding:10px 0;
              "
            >
              ${safePhone}
            </td>
          </tr>


          <tr>
            <td
              style="
                padding:10px 0;
                color:#6b7280;
                font-weight:bold;
              "
            >
              Subject
            </td>

            <td
              style="
                padding:10px 0;
              "
            >
              ${safeSubject}
            </td>
          </tr>

        </table>


        <!-- MESSAGE -->

        <div
          style="
            margin-top:28px;
          "
        >

          <h2
            style="
              margin:0 0 14px;
              font-size:18px;
              color:#111827;
            "
          >
            Customer Message
          </h2>

          <div
            style="
              background:#f9fafb;
              border:1px solid #e5e7eb;
              border-radius:12px;
              padding:18px;
              font-size:14px;
              line-height:1.7;
              white-space:pre-wrap;
              color:#374151;
            "
          >
${safeMessage}
          </div>

        </div>


        <!-- SYSTEM INFO -->

        <div
          style="
            margin-top:28px;
            padding:18px;
            background:#eff6ff;
            border:1px solid #dbeafe;
            border-radius:12px;
          "
        >

          <h3
            style="
              margin:0 0 14px;
              font-size:15px;
              color:#1e3a8a;
            "
          >
            Support Information
          </h3>


          <p
            style="
              margin:7px 0;
              font-size:13px;
              color:#374151;
            "
          >
            <strong>Source:</strong>
            ERP_SUPPORT_CHAT
          </p>


          <p
            style="
              margin:7px 0;
              font-size:13px;
              color:#374151;
            "
          >
            <strong>Lead ID:</strong>
            ${safeLeadId}
          </p>


          <p
            style="
              margin:7px 0;
              font-size:13px;
              color:#374151;
              word-break:break-all;
            "
          >
            <strong>Conversation ID:</strong>
            ${safeConversationId}
          </p>

        </div>


        <!-- FOOTER -->

        <div
          style="
            margin-top:28px;
            padding-top:20px;
            border-top:1px solid #e5e7eb;
            font-size:12px;
            color:#9ca3af;
          "
        >
          This email was automatically generated by Ready Tech ERP
          Support Chat.
        </div>

      </div>

    </div>

  </div>

</body>

</html>
`;

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,

      to: [SUPPORT_EMAIL],

      replyTo: email,

      subject: emailSubject,

      html,
    });

    if (result?.error) {
      throw new Error(
        result.error.message || "Resend failed to send email"
      );
    }

    return {
      success: true,
      emailId: result?.data?.id || null,
      recipient: SUPPORT_EMAIL,
    };
  } catch (error) {
    console.error("❌ Resend support email error:", error);

    throw new Error(
      error.message || "Failed to send support email"
    );
  }
};

module.exports = {
  sendSupportEmail,
};