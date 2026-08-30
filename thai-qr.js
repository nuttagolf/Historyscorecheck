(function (root, factory) {
  root.ThaiQR = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PROMPTPAY_AID = "A000000677010111";

  function tlv(id, value) {
    const text = String(value);
    if (text.length > 99) throw new Error("ข้อมูล QR ยาวเกินมาตรฐาน");
    return `${id}${String(text.length).padStart(2, "0")}${text}`;
  }

  function normalizePromptPayId(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("0")) {
      return { tag: "01", value: `0066${digits.slice(1)}`, type: "mobile" };
    }
    if (digits.length === 13) {
      return { tag: "02", value: digits, type: "national-or-tax-id" };
    }
    if (digits.length === 15) {
      return { tag: "03", value: digits, type: "ewallet" };
    }
    throw new Error("เลขพร้อมเพย์ต้องเป็นเบอร์มือถือ 10 หลัก เลขบัตร/เลขภาษี 13 หลัก หรือ e-Wallet 15 หลัก");
  }

  function crc16Ccitt(text) {
    let crc = 0xFFFF;
    for (let index = 0; index < text.length; index += 1) {
      crc ^= text.charCodeAt(index) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildPromptPayPayload(promptPayId, amount) {
    const proxy = normalizePromptPayId(promptPayId);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount >= 1_000_000_000) {
      throw new Error("ยอดชำระไม่ถูกต้อง");
    }

    const merchantAccount = tlv("00", PROMPTPAY_AID) + tlv(proxy.tag, proxy.value);
    const payloadWithoutCrc = [
      tlv("00", "01"),
      tlv("01", "12"),
      tlv("29", merchantAccount),
      tlv("53", "764"),
      tlv("54", numericAmount.toFixed(2)),
      tlv("58", "TH"),
      "6304"
    ].join("");

    return payloadWithoutCrc + crc16Ccitt(payloadWithoutCrc);
  }

  return {
    buildPromptPayPayload,
    crc16Ccitt,
    normalizePromptPayId
  };
}));
